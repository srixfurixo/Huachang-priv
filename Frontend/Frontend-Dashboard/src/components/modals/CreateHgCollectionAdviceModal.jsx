import { useState, useEffect } from 'react'
import {
    Modal,
    Form,
    Input,
    InputNumber,
    Select,
    DatePicker,
    Button,
    Space,
    Row,
    Col,
    Typography,
    Upload,
    Divider,
    Card,
    Switch,
    Radio,
    App,
} from 'antd'
import {
    PlusOutlined,
    MinusCircleOutlined,
    UploadOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import api from '../../utils/api'

function CreateHgCollectionAdviceModal(props) {
    const open = props.open
    const onClose = props.onClose
    const onSuccess = props.onSuccess

    const { message } = App.useApp()
    const [caForm] = Form.useForm()

    const [activeSupplierCas, setActiveSupplierCas] = useState([])
    const [locationList, setLocationList] = useState([])
    const [customerList, setCustomerList] = useState([])
    const [fileList, setFileList] = useState([])
    const [submitting, setSubmitting] = useState(false)
    const [autoGenerateCode, setAutoGenerateCode] = useState(true)

    // Watch dynamic form fields for live UI calculations
    const itemsValue = Form.useWatch('items', caForm) || []
    const destinationType = Form.useWatch('destination_type', caForm) || 'INTERNAL'

    // Generate a standard collection advice code (e.g. CA 25-0101)
    function generateCaCode() {
        const year = dayjs().format('YY')
        const randomNum = Math.floor(1000 + Math.random() * 9000)
        return 'CA ' + year + '-' + String(randomNum)
    }

    // Step 1: Fetch dropdown reference data from backend
    async function loadReferenceData() {
        try {
            const caRes = await api.get('/referenceData/active-supplier-cas')
            const cas = caRes.data.supplier_cas || caRes.data || []
            setActiveSupplierCas(Array.isArray(cas) ? cas : [])

            const locRes = await api.get('/referenceData/locations')
            const locations = locRes.data.locations || locRes.data || []
            setLocationList(Array.isArray(locations) ? locations : [])

            const custRes = await api.get('/referenceData/customers')
            const customers = custRes.data.customers || custRes.data || []
            setCustomerList(Array.isArray(customers) ? customers : [])
        } catch (err) {
            message.error('Failed to load reference data for collection advice.')
        }
    }

    // Find details of a selected supplier lot to read its item code and remaining balance
    function getSupplierCaDetails(supplierCaId) {
        for (let i = 0; i < activeSupplierCas.length; i++) {
            const item = activeSupplierCas[i]
            const targetId = item.supplier_ca_id || item.id
            if (targetId === supplierCaId) {
                return item
            }
        }
        return null
    }

    // Step 2: Initialize form when modal opens
    useEffect(() => {
        if (open) {
            loadReferenceData()
            caForm.setFieldsValue({
                hg_ca_number: autoGenerateCode ? generateCaCode() : '',
                ca_date: dayjs(),
                destination_type: 'INTERNAL',
                items: [{}],
            })
        }
    }, [open])

    // Toggle auto-generating the CA number
    function handleToggleAutoCode(checked) {
        setAutoGenerateCode(checked)
        caForm.setFieldsValue({
            hg_ca_number: checked ? generateCaCode() : '',
        })
    }

    // Auto-fill the item code when the user picks a supplier CA lot
    function handleSupplierCaChange(fieldIndex, selectedId) {
        const ca = getSupplierCaDetails(selectedId)
        if (ca) {
            caForm.setFieldValue(['items', fieldIndex, 'item_code'], ca.item_code)
        }
    }

    // Calculate total dispatch tonnage live
    let totalTonnage = 0
    if (Array.isArray(itemsValue)) {
        for (let i = 0; i < itemsValue.length; i++) {
            const row = itemsValue[i]
            if (row) {
                totalTonnage += Number(row.quantity_mt || 0)
            }
        }
    }

    // Reset and close modal
    function handleModalClose() {
        caForm.resetFields()
        setFileList([])
        if (onClose) {
            onClose()
        }
    }

    // Step 3: Format and submit data to backend
    async function handleFinish(values) {
        setSubmitting(true)
        try {
            // Build the line items array
            const itemsPayload = []
            if (Array.isArray(values.items)) {
                for (let i = 0; i < values.items.length; i++) {
                    const row = values.items[i]
                    if (row) {
                        itemsPayload.push({
                            supplier_ca_id: row.supplier_ca_id,
                            item_code: row.item_code,
                            quantity_mt: Number(row.quantity_mt || 0),
                        })
                    }
                }
            }

            // Build the main header payload
            const payload = {
                hg_ca_number: values.hg_ca_number,
                ca_date: values.ca_date ? values.ca_date.format('YYYY-MM-DD') : null,
                pickup_location_id: values.pickup_location_id,
                destination_type: values.destination_type,
                destination_customer_id: values.destination_type === 'CUSTOMER' ? values.destination_customer_id : null,
                lorry_number: values.lorry_number,
                driver_name: values.driver_name || null,
                transporter_name: values.transporter_name || null,
                created_by: 1,
                items: itemsPayload,
            }

            // Post to collection advice route
            await api.post('/advices/huachang-ca', payload)

            // Upload PDF if attached
            if (fileList.length > 0) {
                const formData = new FormData()
                formData.append('document', fileList[0])
                formData.append('document_type', 'HG_CA')
                formData.append('reference_number', values.hg_ca_number)
                formData.append('document_name', fileList[0].name)

                await api.post('/documents/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                })
            }

            message.success('Huachang Collection Advice issued successfully.')
            handleModalClose()
            if (onSuccess) {
                onSuccess()
            }
        } catch (err) {
            const errorMsg = err.response?.data?.error || 'Failed to issue Huachang Collection Advice.'
            message.error(errorMsg)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Modal
            title="Issue Huachang Collection Advice"
            open={open}
            onCancel={handleModalClose}
            onOk={() => caForm.submit()}
            confirmLoading={submitting}
            width={1050}
        >
            <Form
                form={caForm}
                layout="vertical"
                onFinish={handleFinish}
                initialValues={{
                    destination_type: 'INTERNAL',
                    items: [{}],
                }}
            >
                <Row style={{ marginBottom: 16 }}>
                    <Space align="center">
                        <Switch
                            checked={autoGenerateCode}
                            onChange={handleToggleAutoCode}
                        />
                        <Typography.Text>Auto-Generate Huachang CA Number</Typography.Text>
                    </Space>
                </Row>

                <Row gutter={16}>
                    <Col span={8}>
                        <Form.Item
                            name="hg_ca_number"
                            label="Huachang CA Number"
                            rules={[{ required: true, message: 'Please enter CA number!' }]}
                        >
                            <Input
                                placeholder="e.g. CA 25-0101"
                                disabled={autoGenerateCode}
                            />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item
                            name="ca_date"
                            label="Collection Date"
                            rules={[{ required: true, message: 'Please select date!' }]}
                        >
                            <DatePicker style={{ width: '100%' }} />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item
                            name="pickup_location_id"
                            label="Pickup Warehouse Location"
                            rules={[{ required: true, message: 'Please select pickup location!' }]}
                        >
                            <Select
                                placeholder="Select Pickup Location"
                                showSearch={true}
                                optionFilterProp="label"
                                options={locationList.map((location) => ({
                                    value: location.id,
                                    label: location.name,
                                }))}
                            />
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col span={12}>
                        <Form.Item
                            name="destination_type"
                            label="Destination Type"
                            rules={[{ required: true, message: 'Please select destination type!' }]}
                        >
                            <Radio.Group>
                                <Radio value="INTERNAL">Warehouse Intake / Factory Storage</Radio>
                                <Radio value="CUSTOMER">Direct Delivery to Customer</Radio>
                            </Radio.Group>
                        </Form.Item>
                    </Col>

                    {destinationType === 'CUSTOMER' && (
                        <Col span={12}>
                            <Form.Item
                                name="destination_customer_id"
                                label="Destination Customer"
                                rules={[{ required: true, message: 'Please select destination customer!' }]}
                            >
                                <Select
                                    placeholder="Select Customer"
                                    showSearch={true}
                                    optionFilterProp="label"
                                    options={customerList.map((customer) => ({
                                        value: customer.id,
                                        label: customer.debtor_code ? `${customer.name} (${customer.debtor_code})` : customer.name,
                                    }))}
                                />
                            </Form.Item>
                        </Col>
                    )}
                </Row>

                <Row gutter={16}>
                    <Col span={8}>
                        <Form.Item
                            name="lorry_number"
                            label="Lorry Number Plate"
                            rules={[{ required: true, message: 'Please enter lorry plate!' }]}
                        >
                            <Input placeholder="e.g. PRC 7289" />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item name="driver_name" label="Driver Full Name">
                            <Input placeholder="e.g. Tan Ah Hock" />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item name="transporter_name" label="Transporter Company">
                            <Input placeholder="e.g. Huachang Logistics, J&T" />
                        </Form.Item>
                    </Col>
                </Row>

                <Divider orientation="left" style={{ margin: '12px 0' }}>
                    Line Items
                </Divider>

                <Form.List name="items">
                    {(fields, { add, remove }) => (
                        <div>
                            {fields.map((field) => {
                                const rowVal = itemsValue[field.name]
                                const selectedCa = rowVal?.supplier_ca_id ? getSupplierCaDetails(rowVal.supplier_ca_id) : null
                                const selectedLotRemaining = Number(selectedCa?.remaining_qty_mt || 0)
                                const availableDisplay = selectedCa ? `Available: ${selectedLotRemaining} MT` : 'Select Supplier CA'

                                return (
                                    <Space
                                        key={field.key}
                                        align="baseline"
                                        style={{ display: 'flex', marginBottom: 8 }}
                                        wrap={true}
                                    >
                                        <Form.Item
                                            name={[field.name, 'supplier_ca_id']}
                                            label="Supplier CA Lot"
                                            rules={[{ required: true, message: 'Select allocation CA' }]}
                                        >
                                            <Select
                                                placeholder="Select Supplier Allocation CA"
                                                style={{ width: 420 }}
                                                showSearch={true}
                                                optionFilterProp="label"
                                                onChange={(val) => handleSupplierCaChange(field.name, val)}
                                                options={activeSupplierCas.map((ca) => ({
                                                    value: ca.supplier_ca_id || ca.id,
                                                    label: `${ca.supplier_name} - ${ca.supplier_ca_ref} (${ca.item_code} | Bal: ${ca.remaining_qty_mt} MT)`,
                                                }))}
                                            />
                                        </Form.Item>

                                        <Form.Item
                                            name={[field.name, 'item_code']}
                                            label="Item Code"
                                            rules={[{ required: true, message: 'Item required' }]}
                                        >
                                            <Input
                                                style={{ width: 140 }}
                                                placeholder="Item"
                                                readOnly={true}
                                            />
                                        </Form.Item>

                                        <Form.Item
                                            name={[field.name, 'quantity_mt']}
                                            label="Quantity (MT)"
                                            rules={[{ required: true, message: 'Enter quantity' }]}
                                        >
                                            <InputNumber
                                                min={0.001}
                                                max={selectedLotRemaining > 0 ? selectedLotRemaining : undefined}
                                                precision={3}
                                                placeholder="Qty (MT)"
                                                style={{ width: 130 }}
                                            />
                                        </Form.Item>

                                        <div style={{ minWidth: 120, paddingBottom: 24 }}>
                                            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                                [{availableDisplay}]
                                            </Typography.Text>
                                        </div>

                                        {fields.length > 1 && (
                                            <Button
                                                type="text"
                                                danger={true}
                                                icon={<MinusCircleOutlined />}
                                                onClick={() => remove(field.name)}
                                                style={{ marginBottom: 24 }}
                                            />
                                        )}
                                    </Space>
                                )
                            })}

                            <Form.Item>
                                <Button
                                    type="dashed"
                                    onClick={() => add({})}
                                    block={true}
                                    icon={<PlusOutlined />}
                                >
                                    Add Line Item
                                </Button>
                            </Form.Item>
                        </div>
                    )}
                </Form.List>

                <Card
                    size="small"
                    style={{
                        marginBottom: 16,
                        backgroundColor: '#f5f5f5',
                    }}
                >
                    <Typography.Text strong={true}>
                        Total Dispatch Quantity: {totalTonnage.toFixed(3)} MT
                    </Typography.Text>
                </Card>

                <Form.Item label="Attach Document (Optional)">
                    <Upload
                        listType="picture"
                        maxCount={1}
                        fileList={fileList}
                        beforeUpload={(file) => {
                            setFileList([file])
                            return false
                        }}
                        onRemove={() => setFileList([])}
                        accept=".pdf"
                    >
                        <Button icon={<UploadOutlined />}>Upload PDF</Button>
                    </Upload>
                </Form.Item>
            </Form>
        </Modal>
    )
}

export default CreateHgCollectionAdviceModal
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
    App,
    Switch,
} from 'antd'
import {
    PlusOutlined,
    MinusCircleOutlined,
    UploadOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import api from '../../utils/api'

function CreateSalesOrderModal(props) {
    const open = props.open
    const onClose = props.onClose
    const onSuccess = props.onSuccess

    const { message } = App.useApp()
    const [soForm] = Form.useForm()

    const [customerList, setCustomerList] = useState([])
    const [itemList, setItemList] = useState([])
    const [fileList, setFileList] = useState([])
    const [submitting, setSubmitting] = useState(false)
    const [autoGenerateCode, setAutoGenerateCode] = useState(true)

    function generateOrderCode() {
        const now = new Date()
        const year = String(now.getFullYear()).slice(-2)
        const randomNum = Math.floor(10000 + Math.random() * 90000)
        return 'OR-' + year + '-' + randomNum
    }

    async function loadReferenceData() {
        try {
            const customerResponse = await api.get('/referenceData/customers')
            let customers = []
            if (customerResponse.data) {
                if (Array.isArray(customerResponse.data)) {
                    customers = customerResponse.data
                } else if (Array.isArray(customerResponse.data.customers)) {
                    customers = customerResponse.data.customers
                }
            }
            setCustomerList(customers)

            const itemResponse = await api.get('/referenceData/items')
            let items = []
            if (itemResponse.data) {
                if (Array.isArray(itemResponse.data)) {
                    items = itemResponse.data
                } else if (Array.isArray(itemResponse.data.items)) {
                    items = itemResponse.data.items
                }
            }
            setItemList(items)
        } catch (err) {
            message.error('Failed to load customers or items list.')
        }
    }

    useEffect(() => {
        if (open) {
            loadReferenceData()
            if (autoGenerateCode) {
                soForm.setFieldsValue({
                    so_number: generateOrderCode(),
                    so_date: dayjs(),
                })
            }
        }
    }, [open])

    const itemsValue = Form.useWatch('items', soForm) || []

    function calculateBags(orderedQtyMt, packagingKg) {
        const qty = Number(orderedQtyMt || 0)
        const pkg = Number(packagingKg || 0)
        if (pkg > 0 && qty > 0) {
            return Math.round((qty * 1000) / pkg)
        }
        return 0
    }

    let totalTonnage = 0
    let totalBags = 0

    if (Array.isArray(itemsValue)) {
        for (let i = 0; i < itemsValue.length; i++) {
            const row = itemsValue[i]
            if (row) {
                const qty = Number(row.ordered_qty_mt || 0)
                const pkg = Number(row.packaging_kg || 0)

                totalTonnage += qty
                totalBags += calculateBags(qty, pkg)
            }
        }
    }

    function handleToggleAutoCode(checked) {
        setAutoGenerateCode(checked)
        if (checked) {
            soForm.setFieldsValue({
                so_number: generateOrderCode(),
            })
        } else {
            soForm.setFieldsValue({
                so_number: '',
            })
        }
    }

    function handleBeforeUpload(file) {
        const maxLimitInBytes = 5 * 1024 * 1024
        if (file.size > maxLimitInBytes) {
            message.error('File size exceeds the 5MB limit.')
            return Upload.LIST_IGNORE
        }
        setFileList([file])
        return false
    }

    function handleRemoveFile() {
        setFileList([])
    }

    function handleModalClose() {
        soForm.resetFields()
        setFileList([])
        if (onClose) {
            onClose()
        }
    }

    async function handleFinish(values) {
        setSubmitting(true)
        try {
            const itemsPayload = []
            if (Array.isArray(values.items)) {
                for (let i = 0; i < values.items.length; i++) {
                    const row = values.items[i]
                    const qty = Number(row.ordered_qty_mt || 0)
                    const pkg = Number(row.packaging_kg || 0)
                    const bags = calculateBags(qty, pkg)

                    let formattedEstimatedDate = null
                    if (row.estimated_delivery_date) {
                        formattedEstimatedDate = row.estimated_delivery_date.format('YYYY-MM-DD')
                    }

                    itemsPayload.push({
                        item_code: row.item_code,
                        ordered_qty_mt: qty,
                        packaging_kg: pkg,
                        no_of_bags: bags,
                        estimated_delivery_date: formattedEstimatedDate,
                    })
                }
            }

            let formattedSoDate = null
            if (values.so_date) {
                formattedSoDate = values.so_date.format('YYYY-MM-DD')
            }

            let salesAgentValue = null
            if (values.sales_agent) {
                salesAgentValue = values.sales_agent
            }

            let shipViaValue = 'Lorry'
            if (values.ship_via) {
                shipViaValue = values.ship_via
            }

            let remarksValue = null
            if (values.remarks) {
                remarksValue = values.remarks
            }

            const payload = {
                so_number: values.so_number,
                customer_id: values.customer_id,
                so_date: formattedSoDate,
                sales_agent: salesAgentValue,
                ship_via: shipViaValue,
                remarks: remarksValue,
                created_by: 1,
                items: itemsPayload,
            }

            await api.post('/orders/sales', payload)

            if (fileList.length > 0) {
                const attachedFile = fileList[0]
                const formData = new FormData()
                formData.append('document', attachedFile)
                formData.append('document_type', 'SO')
                formData.append('reference_number', values.so_number)
                formData.append('document_name', attachedFile.name)

                await api.post('/documents/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                })
            }

            message.success('Sales Order registered successfully.')
            handleModalClose()
            if (onSuccess) {
                onSuccess()
            }
        } catch (err) {
            let errorMsg = 'Failed to create Sales Order.'
            if (err.response && err.response.data && err.response.data.error) {
                errorMsg = err.response.data.error
            }
            message.error(errorMsg)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Modal
            title="Create New Sales Order"
            open={open}
            onCancel={handleModalClose}
            onOk={() => soForm.submit()}
            confirmLoading={submitting}
            width={1050}
            destroyOnClose={true}
        >
            <Form
                form={soForm}
                layout="vertical"
                onFinish={handleFinish}
                initialValues={{
                    ship_via: 'Lorry',
                    uom: 'MT',
                    items: [{ packaging_kg: 50 }],
                }}
            >
                <Divider orientation="left" style={{ margin: '18px 0' }}>
                    Sales Order Details
                </Divider>
                <Row gutter={16} align="middle" style={{ marginBottom: 12 }}>
                    <Col span={24}>
                        <Space orientation="horizontal">
                            <Switch
                                checked={autoGenerateCode}
                                onChange={handleToggleAutoCode}
                            />
                            <Typography.Text>Auto-generate Order Number</Typography.Text>
                        </Space>
                    </Col>
                </Row>

                <Row gutter={16}>
                    <Col span={6}>
                        <Form.Item
                            name="so_number"
                            label="Order Number"
                            rules={[{ required: true, message: 'Please enter SO number!' }]}
                        >
                            <Input
                                placeholder="e.g. OR-25-01933"
                                // disabled={autoGenerateCode}
                            />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            name="customer_id"
                            label="Customer (Debtor)"
                            rules={[{ required: true, message: 'Please select customer!' }]}
                        >
                            <Select
                                placeholder="Select Customer"
                                showSearch={true}
                                optionFilterProp="label"
                                style={{ width: '100%' }}
                                options={customerList.map((customer) => {
                                    return {
                                        value: customer.id,
                                        label: `${customer.name} (${customer.debtor_code})`,
                                    }
                                })}
                            />
                        </Form.Item>
                    </Col>
                    <Col span={6}>
                        <Form.Item
                            name="so_date"
                            label="SO Date"
                            rules={[{ required: true, message: 'Please select date!' }]}
                        >
                            <DatePicker style={{ width: '100%' }} />
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item name="sales_agent" label="Sales Agent">
                            <Input placeholder="e.g. SM-03" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="ship_via" label="Ship Via">
                            <Select
                                options={[
                                    { value: 'Lorry', label: 'Lorry' },
                                    { value: 'Trailer', label: 'Trailer' },
                                    { value: 'Self Collect', label: 'Self Collect' },
                                ]}
                            />
                        </Form.Item>
                    </Col>
                </Row>

                <Divider orientation="left" style={{ margin: '18px 0' }}>
                    Line Items
                </Divider>

                <Form.List name="items">
                    {(fields, { add, remove }) => {
                        return (
                            <div>
                                {fields.map((field) => {
                                    const rowVal = itemsValue[field.name]
                                    let rowQty = 0
                                    let rowPkg = 0
                                    if (rowVal) {
                                        rowQty = rowVal.ordered_qty_mt
                                        rowPkg = rowVal.packaging_kg
                                    }
                                    const lineBags = calculateBags(rowQty, rowPkg)

                                    return (
                                        <Space
                                            key={field.key}
                                            align="baseline"
                                            style={{ display: 'flex', marginBottom: 8 }}
                                            wrap={true}
                                        >
                                            <Form.Item
                                                name={[field.name, 'item_code']}
                                                label="Item"
                                                // style={{ width: 400 }}
                                                rules={[{ required: true, message: 'Select item' }]}
                                            >
                                                <Select
                                                    placeholder="Select Item"
                                                    style={{ width: 400 }}
                                                    showSearch={true}
                                                    optionFilterProp="label"
                                                    options={itemList.map((item) => {
                                                        return {
                                                            value: item.item_code,
                                                            label: `${item.item_code} - ${item.description}`,
                                                        }
                                                    })}
                                                />
                                            </Form.Item>

                                            <Form.Item
                                                name={[field.name, 'ordered_qty_mt']}
                                                label="Qty (MT)"
                                                rules={[{ required: true, message: 'Enter quantity' }]}
                                            >
                                                <InputNumber
                                                    min={0.001}
                                                    precision={3}
                                                    placeholder="Qty (MT)"
                                                    style={{ width: 130 }}
                                                />
                                            </Form.Item>

                                            <Form.Item
                                                name={[field.name, 'packaging_kg']}
                                                label="Packaging"
                                                rules={[{ required: true, message: 'Select packaging' }]}
                                            >
                                                <Select
                                                    style={{ width: 140 }}
                                                    options={[
                                                        { value: 50, label: '50 KG Bag' },
                                                        { value: 25, label: '25 KG Bag' },
                                                        { value: 0, label: 'Bulk' },
                                                    ]}
                                                />
                                            </Form.Item>

                                            <Form.Item label="Bag Count">
                                                <Input
                                                    readOnly={true}
                                                    value={lineBags.toLocaleString() + ' Bags'}
                                                    style={{
                                                        width: 130,
                                                        backgroundColor: '#f5f5f5',
                                                        color: '#262626',
                                                        fontWeight: 500,
                                                        textAlign: 'center',
                                                    }}
                                                />
                                            </Form.Item>

                                            <Form.Item
                                                name={[field.name, 'estimated_delivery_date']}
                                                label="Est. Delivery"
                                            >
                                                <DatePicker style={{ width: 140 }} />
                                            </Form.Item>

                                            {fields.length > 1 ? (
                                                <Button
                                                    type="text"
                                                    danger={true}
                                                    icon={<MinusCircleOutlined />}
                                                    onClick={() => remove(field.name)}
                                                    style={{ marginBottom: 24 }}
                                                />
                                            ) : null}
                                        </Space>
                                    )
                                })}

                                <Form.Item>
                                    <Button
                                        type="dashed"
                                        onClick={() => add({ packaging_kg: 50 })}
                                        block={true}
                                        icon={<PlusOutlined />}
                                    >
                                        Add Line Item
                                    </Button>
                                </Form.Item>
                            </div>
                        )
                    }}
                </Form.List>

                <Card
                    size="small"
                    style={{
                        marginBottom: 16,
                        backgroundColor: '#f5f5f5',
                    }}
                >
                    <Typography.Text strong={true}>
                        Total Quantity: {totalTonnage.toFixed(3)} MT | Total Bags: {totalBags.toLocaleString()} Bags
                    </Typography.Text>
                </Card>

                <Form.Item name="remarks" label="Remarks / Delivery Instructions">
                    <Input.TextArea
                        rows={2}
                        placeholder="Delivery instructions, e.g., URGENT..."
                    />
                </Form.Item>

                <Form.Item label="Attach Document (Optional)">
                    <Upload
                        listType="picture"
                        maxCount={1}
                        fileList={fileList}
                        beforeUpload={handleBeforeUpload}
                        onRemove={handleRemoveFile}
                        accept=".pdf"
                    >
                        <Button icon={<UploadOutlined />}>Upload PDF (Max 5MB)</Button>
                    </Upload>
                </Form.Item>
            </Form>
        </Modal>
    )
}

export default CreateSalesOrderModal
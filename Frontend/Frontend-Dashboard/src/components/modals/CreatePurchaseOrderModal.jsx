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
    App,
} from 'antd'
import {
    PlusOutlined,
    MinusCircleOutlined,
    UploadOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import api from '../../utils/api'

function CreatePurchaseOrderModal(props) {
    const open = props.open
    const onClose = props.onClose
    const onSuccess = props.onSuccess

    const { message } = App.useApp()
    const [poForm] = Form.useForm()

    const [supplierList, setSupplierList] = useState([])
    const [itemList, setItemList] = useState([])
    const [fileList, setFileList] = useState([])
    const [submitting, setSubmitting] = useState(false)
    const [autoGenerateCode, setAutoGenerateCode] = useState(true)

    function generateOrderCode() {
        const now = dayjs()
        const yearMonth = now.format('YYMM')
        const randomNum = Math.floor(10000 + Math.random() * 90000)
        return 'PO-' + yearMonth + '-' + String(randomNum)
    }

    async function loadReferenceData() {
        try {
            const supplierRes = await api.get('/referenceData/suppliers')
            const suppliers = supplierRes.data?.suppliers || supplierRes.data || []
            setSupplierList(Array.isArray(suppliers) ? suppliers : [])

            const itemRes = await api.get('/referenceData/items')
            const items = itemRes.data?.items || itemRes.data || []
            setItemList(Array.isArray(items) ? items : [])
        } catch (err) {
            message.error('Failed to load reference data.')
        }
    }

    useEffect(() => {
        if (open) {
            loadReferenceData()
            poForm.setFieldsValue({
                po_number: autoGenerateCode ? generateOrderCode() : '',
                po_date: dayjs(),
                ship_via: 'Lorry',
            })
        }
    }, [open])

    function handleToggleAutoCode(checked) {
        setAutoGenerateCode(checked)
        poForm.setFieldsValue({
            po_number: checked ? generateOrderCode() : '',
        })
    }

    const itemsValue = Form.useWatch('items', poForm) || []

    let totalTonnage = 0
    let totalItemCount = 0
	let uomValue = 'MT'

    if (Array.isArray(itemsValue)) {
        totalItemCount = itemsValue.length
        for (let i = 0; i < itemsValue.length; i++) {
            const row = itemsValue[i]
            if (row) {
                totalTonnage += Number(row.ordered_qty_mt || 0)
            }
        }
    }

    function getItemUom(itemCode) {
        for (let i = 0; i < itemList.length; i++) {
            if (itemList[i].item_code === itemCode) {
                return itemList[i].uom || 'MT'
            }
        }
        return 'MT'
    }

    function handleBeforeUpload(file) {
        if (file.size > 5 * 1024 * 1024) {
            message.error('File size exceeds the 5MB limit.')
            return Upload.LIST_IGNORE
        }
        setFileList([file])
        return false
    }

    function handleModalClose() {
        poForm.resetFields()
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
                    if (row) {
                        itemsPayload.push({
                            item_code: row.item_code,
                            ordered_qty_mt: Number(row.ordered_qty_mt || 0),
                        })
                    }
                }
            }

            const payload = {
                po_number: values.po_number,
                supplier_id: values.supplier_id,
                po_date: values.po_date ? values.po_date.format('YYYY-MM-DD') : null,
                delivery_date: values.delivery_date ? values.delivery_date.format('YYYY-MM-DD') : null,
                ship_via: values.ship_via || 'Lorry',
                remarks: values.remarks || null,
                created_by: 1,
                items: itemsPayload,
            }

            await api.post('/orders/purchase', payload)

            if (fileList.length > 0) {
                const formData = new FormData()
                formData.append('document', fileList[0])
                formData.append('document_type', 'PO')
                formData.append('reference_number', values.po_number)
                formData.append('document_name', fileList[0].name)

                await api.post('/documents/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                })
            }

            message.success('Purchase Order created successfully.')
            handleModalClose()
            if (onSuccess) {
                onSuccess()
            }
        } catch (err) {
            const errorMsg = err.response?.data?.error || 'Failed to create Purchase Order.'
            message.error(errorMsg)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Modal
            title="Create New Purchase Order"
            open={open}
            onCancel={handleModalClose}
            onOk={() => poForm.submit()}
            confirmLoading={submitting}
            width={1050}
            destroyOnClose={true}
        >
            <Form
                form={poForm}
                layout="vertical"
                onFinish={handleFinish}
                initialValues={{
                    ship_via: 'Lorry',
                    items: [{}],
                }}
            >
                <Row style={{ marginBottom: 16 }}>
                    <Space align="center">
                        <Switch
                            checked={autoGenerateCode}
                            onChange={handleToggleAutoCode}
                        />
                        <Typography.Text>Auto-generate PO Number</Typography.Text>
                    </Space>
                </Row>

                <Row gutter={16}>
                    <Col span={6}>
                        <Form.Item
                            name="po_number"
                            label="PO Number"
                            rules={[{ required: true, message: 'Please enter PO number!' }]}
                        >
                            <Input
                                placeholder="e.g. PO-2609-12345"
                                //disabled={autoGenerateCode}
                            />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item
                            name="supplier_id"
                            label="Supplier"
                            rules={[{ required: true, message: 'Please select supplier!' }]}
                        >
                            <Select
                                placeholder="Select Supplier"
                                showSearch={true}
                                optionFilterProp="label"
                                options={supplierList.map((supplier) => ({
                                    value: supplier.id,
                                    label: supplier.code ? `${supplier.name} (${supplier.code})` : supplier.name,
                                }))}
                            />
                        </Form.Item>
                    </Col>
                    <Col span={5}>
                        <Form.Item
                            name="po_date"
                            label="PO Date"
                            rules={[{ required: true, message: 'Please select date!' }]}
                        >
                            <DatePicker style={{ width: '100%' }} />
                        </Form.Item>
                    </Col>
                    <Col span={5}>
                        <Form.Item
                            name="delivery_date"
                            label="Delivery Date"
                        >
                            <DatePicker style={{ width: '100%' }} />
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={16}>
                    <Col span={6}>
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

                <Divider orientation="left" style={{ margin: '12px 0' }}>
                    Line Items
                </Divider>

                <Form.List name="items">
                    {(fields, { add, remove }) => (
                        <div>
                            {fields.map((field) => {
                                const rowVal = itemsValue[field.name]
                                const selectedUom = rowVal?.item_code ? getItemUom(rowVal.item_code) : 'MT'
								const uomValue = selectedUom
								// console.log('Selected UOM:', selectedUom)
								// console.log('UOM Value:', uomValue)

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
                                            rules={[{ required: true, message: 'Select item' }]}
                                        >
                                            <Select
                                                placeholder="Select Item"
                                                style={{ width: 340 }}
                                                showSearch={true}
                                                optionFilterProp="label"
                                                options={itemList.map((item) => ({
                                                    value: item.item_code,
                                                    label: `${item.item_code} - ${item.description}`,
                                                }))}
                                            />
                                        </Form.Item>

                                        <Form.Item
                                            name={[field.name, 'ordered_qty_mt']}
                                            label="Qty"
                                            rules={[{ required: true, message: 'Enter quantity' }]}
                                        >
                                            <InputNumber
                                                min={0.001}
                                                precision={3}
                                                placeholder="Qty"
                                                style={{ width: 140 }}
                                            />
                                        </Form.Item>

                                        <Form.Item label="UOM">
                                            <Input
                                                readOnly={true}
                                                value={selectedUom}
                                                style={{
                                                    width: 80,
                                                    backgroundColor: '#f5f5f5',
                                                    textAlign: 'center',
                                                    fontWeight: 500,
                                                }}
                                            />
                                        </Form.Item>

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
                        Total Quantity: {totalTonnage.toFixed(3)} {itemsValue[0]?.item_code ? getItemUom(itemsValue[0]?.item_code) : 'MT'} | Total Items: {totalItemCount} Items
                    </Typography.Text>
                </Card>

                <Form.Item name="remarks" label="Remarks / Instructions">
                    <Input.TextArea
                        rows={2}
                        placeholder="Delivery instructions or supplier notes..."
                    />
                </Form.Item>

                <Form.Item label="Attach Document (Optional)">
                    <Upload
                        listType="picture"
                        maxCount={1}
                        fileList={fileList}
                        beforeUpload={handleBeforeUpload}
                        onRemove={() => setFileList([])}
                        accept=".pdf"
                    >
                        <Button icon={<UploadOutlined />}>Upload PDF (Max 5MB)</Button>
                    </Upload>
                </Form.Item>
            </Form>
        </Modal>
    )
}

export default CreatePurchaseOrderModal
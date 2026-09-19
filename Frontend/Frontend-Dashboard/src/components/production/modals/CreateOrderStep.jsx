import React, { useState } from 'react';
import { Form, Input, InputNumber, Select, DatePicker, Radio, Button, Space, message, Switch} from 'antd';
import axios from 'axios';
import dayjs from 'dayjs';

function CreateOrderStep({ selectedLine, onNext, onCancel }) {
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();
    const [auto_generateCode, setAutoGenerateCode] = useState(true);


    let production_order_code = ''
    function handleAutoGenerateChange(checked) {
        setAutoGenerateCode(checked);
        if (checked) {
            form.setFieldsValue({
                production_order_code: `PO-${dayjs().format('YYYYMMDD')}-${Math.floor(100 + Math.random() * 900)}`
            });
        } else {
            form.setFieldsValue({
                production_order_code: ''
            });
        }
    }

    const onChange = (checked) => {
        handleAutoGenerateChange(checked);
    };

    async function onFinish(values) {
        setLoading(true);
        try {
            const payload = {
                production_order_code: values.production_order_code,
                so_line_id: selectedLine.so_line_id,
                item_code: selectedLine.item_code,
                handling_type: values.handling_type,
                target_qty_mt: values.target_qty_mt,
                target_packaging: values.target_packaging,
                target_unit_count: values.target_unit_count,
                scheduled_start_date: values.scheduled_start_date.format('YYYY-MM-DD'),
                scheduled_end_date: values.scheduled_end_date ? values.scheduled_end_date.format('YYYY-MM-DD') : null,
                scheduled_shift: values.scheduled_shift,
                recipe_instructions: values.recipe_instructions || null,
            };

            const res = await axios.post('/api/production/create-order', payload);
            if (res.data?.success) {
                onNext(res.data.production_order);
            }
        } catch (err) {
            message.error(err.response?.data?.error || 'Failed to create order header.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            initialValues={{
                production_order_code: '',
                handling_type: 'Mixing',
                target_qty_mt: selectedLine?.ordered_qty_mt || 0,
                target_packaging: `${selectedLine?.packaging_kg || 50}kg Bags`,
                target_unit_count: selectedLine?.no_of_bags || 0,
                scheduled_start_date: selectedLine?.estimated_delivery_date ? dayjs(selectedLine.estimated_delivery_date) : dayjs(),
                scheduled_shift: 'Morning',
            }}
        >
            <Switch onChange={onChange} label="Auto-generate Production Code"  style={{ marginBottom: 10 }}/> <text style={{ marginBottom: 16, marginLeft: 8 }}>Auto-generate Production Code</text>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                
                <Form.Item name="production_order_code" label="Production Code" rules={[{ required: true }]}>
                    <Input />
                </Form.Item>

                <Form.Item name="handling_type" label="Handling Type" rules={[{ required: true }]}>
                    <Select options={[
                        { label: 'Mixing', value: 'Mixing' },
                        { label: 'Repacking', value: 'Repacking' },
                        { label: 'Direct Trading', value: 'Direct_Trading' },
                    ]} />
                </Form.Item>

                <Form.Item name="target_qty_mt" label="Target Quantity (MT)" rules={[{ required: true }]}>
                    <InputNumber style={{ width: '100%' }} min={0.1} />
                </Form.Item>

                <Form.Item name="target_packaging" label="Packaging Spec" rules={[{ required: true }]}>
                    <Input placeholder="e.g. 50kg Bags" />
                </Form.Item>

                <Form.Item name="target_unit_count" label="Target Unit Count (Bags)" rules={[{ required: true }]}>
                    <InputNumber style={{ width: '100%' }} min={1} />
                </Form.Item>

                <Form.Item name="scheduled_start_date" label="Scheduled Start Date" rules={[{ required: true }]}>
                    <DatePicker style={{ width: '100%' }} />
                </Form.Item>

                <Form.Item name="scheduled_shift" label="Shift" rules={[{ required: true }]}>
                    <Radio.Group>
                        <Radio value="Morning">Morning</Radio>
                        <Radio value="Afternoon">Afternoon</Radio>
                    </Radio.Group>
                </Form.Item>
            </div>

            <Form.Item name="recipe_instructions" label="Recipe / Operational Instructions">
                <Input.TextArea rows={2} placeholder="Optional instructions for floor workers..." />
            </Form.Item>

            <div style={{ textAlign: 'right', marginTop: 16 }}>
                <Space>
                    <Button onClick={onCancel}>Cancel</Button>
                    <Button type="primary" htmlType="submit" loading={loading}>
                        Proceed to Material Allocation
                    </Button>
                </Space>
            </div>
        </Form>
    );
}

export default CreateOrderStep;

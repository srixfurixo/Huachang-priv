import React, { useState, useEffect } from 'react';
import { Calendar, Tag, message } from 'antd';
import axios from 'axios';
import dayjs from 'dayjs';
import PDOAssignWorkerModal from '../../../components/modals/ProductionOrderDetailModal';

function OrderCalendarCard({ order, onClick }) {
    const isMorning = order.scheduled_shift === 'Morning';
    const workers = order.assigned_workers || [];

    const statusColors = {
        Draft: '#8c8c8c',
        Pending_Supervisor_Approval: '#fa8c16',
        Ready_For_Execution: '#13c2c2',
        Approved: '#1890ff',
        In_Progress: '#52c41a',
        Completed: '#389e0d',
        Cancelled: '#ff4d4f'
    };

    const cardStyle = {
        backgroundColor: isMorning ? '#f0f7ff' : '#f9f0ff',
        border: `1px solid ${isMorning ? '#bae0ff' : '#d3adf7'}`,
        borderLeft: `4px solid ${isMorning ? '#1677ff' : '#722ed1'}`,
        borderRadius: 4,
        padding: '6px',
        marginBottom: 6,
        fontSize: 11,
        cursor: 'pointer',
        transition: 'all 0.2s ease'
    };

    return (
        <div 
            style={cardStyle} 
            onClick={function (e) {
                e.stopPropagation();
                if (onClick) onClick(order);
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                <b style={{ color: isMorning ? '#0958d9' : '#531dab' }}>
                    {order.production_order_code}
                </b>
                <span style={{ fontSize: 9, color: '#8c8c8c' }}>
                    {order.scheduled_shift || 'Morning'}
                </span>
            </div>

            <div style={{ fontWeight: 600, color: '#262626' }}>
                {order.customer_name || 'No Customer'}
            </div>

            <div style={{ color: '#595959', fontSize: 10 }}>
                {order.item_description || order.item_code}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                <span>{Number(order.target_qty_mt || 0).toFixed(1)} MT</span>
                <span style={{ color: '#10b981', fontWeight: 500 }}>{order.so_number}</span>
            </div>

            <div style={{ marginTop: 4 }}>
                <span style={{
                    fontSize: 9,
                    padding: '1px 5px',
                    borderRadius: 2,
                    backgroundColor: statusColors[order.status] || '#8c8c8c',
                    color: '#fff'
                }}>
                    {order.status ? order.status.replace(/_/g, ' ') : 'Draft'}
                </span>
            </div>

            <div style={{ marginTop: 4, paddingTop: 4, borderTop: '1px solid #e8e8e8' }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#595959' }}>Workers:</div>
                {workers.length === 0 ? (
                    <div style={{ fontSize: 10, color: '#bfbfbf' }}>None assigned</div>
                ) : (
                    workers.map(function (worker) {
                        return (
                            <div key={worker.worker_id} style={{ fontSize: 10, color: '#262626' }}>
                                • {worker.worker_name} ({worker.role})
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

function ProductionCalendarView() {
    const [currentDate, setCurrentDate] = useState(dayjs());
    const [orders, setOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);

    function fetchSchedule(date) {
        const targetDate = date || currentDate;
        const start_date = targetDate.startOf('month').format('YYYY-MM-DD');
        const end_date = targetDate.endOf('month').format('YYYY-MM-DD');

        axios.get(`/api/production/schedule/calendar?start_date=${start_date}&end_date=${end_date}`)
            .then(function (res) {
                if (res.data?.success) {
                    setOrders(res.data.events || []);
                }
            })
            .catch(function () {
                message.error('Failed to load production schedule.');
            });
    }

    useEffect(function () {
        fetchSchedule(currentDate);
    }, [currentDate]);

    function handleCardClick(order) {
        const pdoPayload = {
            id: order.production_order_id,
            production_order_code: order.production_order_code,
            customer_name: order.customer_name,
            so_number: order.so_number,
            item_code: order.item_code,
            item_description: order.item_description,
            handling_type: order.handling_type,
            target_qty_mt: order.target_qty_mt,
            target_packaging: order.target_packaging,
            target_unit_count: order.target_unit_count,
            scheduled_start_date: order.scheduled_start_date,
            scheduled_end_date: order.scheduled_end_date,
            scheduled_shift: order.scheduled_shift,
            status: order.status
        };
        setSelectedOrder(pdoPayload);
        setModalOpen(true);
    }

    function getOrdersForDate(cellDate) {
        const cellFormatted = cellDate.format('YYYY-MM-DD');

        return orders.filter(function (order) {
            const startFormatted = dayjs(order.scheduled_start_date).format('YYYY-MM-DD');
            const endFormatted = order.scheduled_end_date 
                ? dayjs(order.scheduled_end_date).format('YYYY-MM-DD') 
                : startFormatted;

            const isAfterOrOnStart = cellFormatted >= startFormatted;
            const isBeforeOrOnEnd = cellFormatted <= endFormatted;

            return isAfterOrOnStart && isBeforeOrOnEnd;
        });
    }

    function dateCellRender(cellDate) {
        const dayOrders = getOrdersForDate(cellDate);

        if (dayOrders.length === 0) {
            return null;
        }

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                {dayOrders.map(function (order) {
                    return (
                        <OrderCalendarCard 
                            key={order.production_order_id} 
                            order={order} 
                            onClick={handleCardClick}
                        />
                    );
                })}
            </div>
        );
    }

    return (
        <div>
            <style>{`
                .ant-picker-calendar .ant-picker-cell-inner {
                    min-height: 200px !important;
                    height: auto !important;
                }
                .ant-picker-calendar .ant-picker-calendar-date-content {
                    height: auto !important;
                    max-height: none !important;
                }
            `}</style>

            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <Tag color="blue">Morning Shift</Tag>
                <Tag color="purple">Afternoon Shift</Tag>
            </div>

            <Calendar
                value={currentDate}
                onPanelChange={function (newDate) {
                    setCurrentDate(newDate);
                }}
                cellRender={function (current, info) {
                    if (info.type === 'date') {
                        return dateCellRender(current);
                    }
                    return info.originNode;
                }}
            />

            <PDOAssignWorkerModal
                open={modalOpen}
                pdo={selectedOrder}
                onClose={function () {
                    setModalOpen(false);
                    setSelectedOrder(null);
                }}
                onSuccess={function () {
                    fetchSchedule(currentDate);
                }}
            />
        </div>
    );
}

export default ProductionCalendarView;
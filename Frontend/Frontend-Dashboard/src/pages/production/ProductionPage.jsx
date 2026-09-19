import React from 'react';
import { Tabs, Typography, theme } from 'antd';
import AppLayout from '../../components/layout/AppLayout';
import ProductionBacklogView from './views/ProductionBacklogView';
import ProductionHubOrdersView from './views/ProductionHubOrdersView';    
import SupervisorApprovalsView from './views/SupervisorApprovalsView';
import ProductionCalendarView from './views/ProductionCalendarView';

const { Title, Text } = Typography;

const ProductionPage = () => {
    const { token } = theme.useToken();

    const placeholderStyle = {
        padding: '48px 24px',
        textAlign: 'center',
        color: token.colorTextSecondary,
        background: token.colorBgContainer,
        borderRadius: token.borderRadiusLG,
        border: `1px dashed ${token.colorBorderSecondary}`,
    };

    const items = [
        {
            key: '1',
            label: 'Order Backlog & Demand',
            children: <ProductionBacklogView />,
        },
        {
            key: '2',
            label: 'Production Orders Master Hub',
            children: <ProductionHubOrdersView />,
        },
        {
            key: '3',
            label: 'Supervisor Approval Queue',
            children: (
                <SupervisorApprovalsView />
            ),
        },
        {
            key: '4',
            label: 'Master Schedule Calendar',
            children: (
                <ProductionCalendarView />
            ),
        },
    ];

    return (
        <AppLayout breadcrumbs={['Production', 'Overview']}>
            <div style={{ marginBottom: 24 }}>
                <Title
                    level={2}
                    style={{ margin: 0, fontSize: 24, fontWeight: 700, color: token.colorTextHeading }}
                >
                    Production Management
                </Title>
                <Text style={{ color: token.colorTextSecondary, marginTop: 4, display: 'block' }}>
                    Plan, monitor, and manage production orders, work orders, and schedule allocations.
                </Text>
            </div>

            <div
                style={{
                    background: token.colorBgContainer,
                    borderRadius: token.borderRadiusLG,
                    border: `1px solid ${token.colorBorderSecondary}`,
                    padding: '16px 24px 24px',
                }}
            >
                <Tabs defaultActiveKey="1" items={items} />
            </div>
        </AppLayout>
    );
};

export default ProductionPage;

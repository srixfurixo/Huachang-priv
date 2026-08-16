import React, { useState } from 'react';
import { Layout, Card, Form, Input, Button, Typography, Alert, ConfigProvider } from 'antd';
import { ArrowLeftOutlined, MailOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { sanitizeInput } from '../../utils/sanitizeInput';
import { validateEmail } from '../../utils/validators';

// Import logo
import logoImage from '../../assets/images/logos/HuachangGrowmax.png';

const { Content } = Layout;
const { Title, Text } = Typography;

function ForgotPasswordPage() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const onFinish = async (values) => {
    setError('');
    setMessage('');
    setIsSuccess(false);

    const sanitizedEmail = sanitizeInput(values.email);

    if (!validateEmail(sanitizedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post('/api/auth/forgot-password', {
        email: sanitizedEmail
      });

      if (response.data.success) {
        setMessage('If an account matches that email, a password reset link has been sent.');
        setIsSuccess(true);
      } else {
        setError(response.data.message || 'Failed to send reset instructions.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#0f2a4a', // Dark Navy Blue from the dashboard images
          borderRadius: 8,
          fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          colorBgContainer: '#ffffff',
          colorTextBase: '#1f2937',
        },
        components: {
          Button: {
            controlHeight: 44,
            fontSize: 15,
            fontWeight: 600,
            borderRadius: 8,
          },
          Input: {
            controlHeight: 44,
            borderRadius: 8,
          },
          Card: {
            boxShadowSecondary: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
          }
        }
      }}
    >
      <Layout style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
        <Content style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: '24px',
          flex: 1
        }}>
          
          <div style={{ marginBottom: 32, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            <img src={logoImage} alt="Huachang Growmax Logo" style={{ height: 50, objectFit: 'contain' }} />
          </div>

          <Card
            variant="borderless"
            style={{ 
              width: '100%', 
              maxWidth: 460, 
              boxShadow: '0 10px 25px rgba(0,0,0,0.05), 0 4px 10px rgba(0,0,0,0.02)',
              borderRadius: 12,
            }}
            styles={{ body: { padding: '40px' } }}
          >
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <Title level={3} style={{ marginBottom: '8px', fontWeight: 700, color: '#111827' }}>
                Forgot Password
              </Title>
              <Text type="secondary" style={{ fontSize: '15px' }}>
                Enter your registered email address and we'll send you a link to reset your password.
              </Text>
            </div>

            {error && (
              <Alert 
                title={error} 
                type="error" 
                showIcon 
                style={{ marginBottom: 24, borderRadius: 8 }} 
              />
            )}

            {isSuccess && message ? (
              <Alert 
                title={message} 
                type="success" 
                showIcon 
                style={{ marginBottom: 24, borderRadius: 8 }} 
              />
            ) : null}

            {!isSuccess && (
              <Form
                name="forgot_password"
                layout="vertical"
                onFinish={onFinish}
                requiredMark={false}
              >
                <Form.Item
                  name="email"
                  label={<Text strong style={{ color: '#374151' }}>Email Address</Text>}
                  rules={[
                    { required: true, message: 'Please enter your email address!' },
                    { type: 'email', message: 'Please enter a valid email address!' }
                  ]}
                >
                  <Input 
                    prefix={<MailOutlined style={{ color: '#9ca3af', marginRight: 8 }} />} 
                    placeholder="manager@huachang.com" 
                  />
                </Form.Item>

                <Form.Item style={{ marginTop: 32, marginBottom: 16 }}>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    block 
                    loading={loading}
                  >
                    Send Reset Link
                  </Button>
                </Form.Item>
              </Form>
            )}

            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <Link 
                to="/auth/login" 
                style={{ 
                  color: '#6b7280', 
                  textDecoration: 'none', 
                  fontWeight: 600, 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: 8,
                  fontSize: '14px',
                  transition: 'color 0.2s'
                }} 
                onMouseOver={(e) => e.currentTarget.style.color = '#0f2a4a'} 
                onMouseOut={(e) => e.currentTarget.style.color = '#6b7280'}
              >
                <ArrowLeftOutlined /> Back to Login
              </Link>
            </div>
          </Card>
          
          <div style={{ marginTop: 40, textAlign: 'center' }}>
            <Text style={{ fontSize: '13px', color: '#94a3b8' }}>
              © 2026 Huachang Growmax WMS · All rights reserved
            </Text>
          </div>
        </Content>
      </Layout>
    </ConfigProvider>
  );
}

export default ForgotPasswordPage;
import React, { useState, useEffect } from 'react';
import { Layout, Card, Form, Input, Button, Typography, Alert, ConfigProvider } from 'antd';
import { ArrowLeftOutlined, LockOutlined } from '@ant-design/icons';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { sanitizeInput } from '../../utils/sanitizeInput';
import { validatePassword } from '../../utils/validators';

// Import logo
import logoImage from '../../assets/images/logos/HuachangGrowmax.png';

const { Content } = Layout;
const { Title, Text } = Typography;

function ResetPasswordPage() {
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        navigate('/auth/forgot-password');
        return;
      }

      try {
        const response = await axios.get(`http://localhost:5000/api/auth/verify-reset-token/${token}`);
        if (response.data.success) {
          setIsTokenValid(true);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'This reset link is invalid or has expired.');
        setIsTokenValid(false);
      } finally {
        setIsValidating(false);
      }
    };

    verifyToken();
  }, [token, navigate]);

  const onFinish = async (values) => {
    setError('');
    setMessage('');

    const sanitizedPassword = sanitizeInput(values.password);
    const sanitizedConfirmPassword = sanitizeInput(values.confirmPassword);

    if (!validatePassword(sanitizedPassword)) {
      setError('Password must be at least 8 characters, include uppercase, lowercase, number, and special character.');
      return;
    }

    if (sanitizedPassword !== sanitizedConfirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post('http://localhost:5000/api/auth/reset-password', {
        token,
        password: sanitizedPassword
      });

      if (response.data.success) {
        setMessage(response.data.message);
        setTimeout(() => {
          navigate('/auth/login');
        }, 1500);
      } else {
        setError(response.data.message || 'Failed to reset password.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) return null;

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
                Reset Password
              </Title>
              <Text type="secondary" style={{ fontSize: '15px' }}>
                Enter your new password below.
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

            {message && (
              <Alert 
                title={message} 
                type="success" 
                showIcon 
                style={{ marginBottom: 24, borderRadius: 8 }} 
              />
            )}

            {isValidating ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div className="ant-spin ant-spin-spinning">
                  <span className="ant-spin-dot ant-spin-dot-spin">
                    <i className="ant-spin-dot-item"></i><i className="ant-spin-dot-item"></i>
                    <i className="ant-spin-dot-item"></i><i className="ant-spin-dot-item"></i>
                  </span>
                </div>
                <div style={{ marginTop: 16, color: '#6b7280' }}>Verifying...</div>
              </div>
            ) : (
              isTokenValid && (
                <Form
                  name="reset_password"
                  layout="vertical"
                  onFinish={onFinish}
                  requiredMark={false}
                >
                  <Form.Item
                    name="password"
                    label={<Text strong style={{ color: '#374151' }}>New Password</Text>}
                    rules={[
                      { required: true, message: 'Please enter your new password!' },
                    ]}
                  >
                    <Input.Password 
                      prefix={<LockOutlined style={{ color: '#9ca3af', marginRight: 8 }} />} 
                      placeholder="Enter new password" 
                    />
                  </Form.Item>

                  <Form.Item
                    name="confirmPassword"
                    label={<Text strong style={{ color: '#374151' }}>Confirm Password</Text>}
                    rules={[
                      { required: true, message: 'Please confirm your new password!' },
                    ]}
                  >
                    <Input.Password 
                      prefix={<LockOutlined style={{ color: '#9ca3af', marginRight: 8 }} />} 
                      placeholder="Confirm new password" 
                    />
                  </Form.Item>

                  <Form.Item style={{ marginTop: 32, marginBottom: 16 }}>
                    <Button 
                      type="primary" 
                      htmlType="submit" 
                      block 
                      loading={loading}
                    >
                      Reset Password
                    </Button>
                  </Form.Item>
                </Form>
              )
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

export default ResetPasswordPage;
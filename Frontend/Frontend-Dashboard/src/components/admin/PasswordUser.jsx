import React from "react";
import { Modal, Button, Alert, App } from "antd";
import { CopyOutlined } from "@ant-design/icons";

function PasswordUser({ open, onClose, username, password }) {
  const { message } = App.useApp();

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(password);
      message.success("Temporary password copied to clipboard!");
    } catch (err) {
      message.error("Failed to copy password. Please copy it manually.");
    }
  };

  return (
    <Modal
      title="Account Created Successfully"
      open={open} 
      onOk={onClose} 
      closable={false}
      mask={{ closable: false }}
      footer={[
        <Button 
          key="copy" 
          type="default" 
          icon={<CopyOutlined />} 
          onClick={handleCopyPassword}
          disabled={!password}
        >
          Copy Password
        </Button>,
        <Button key="submit" type="primary" onClick={onClose}>
          OK
        </Button>
      ]}
    >
      <div style={{ marginTop: "16px" }}>
        <Alert
          title="Password Created for New Staff"
          type="success"
          showIcon
          description={
            <div style={{ marginTop: "6px" }}>
              <p>The account for user <strong>{username}</strong> is active.</p>
              
              <code style={{ 
                fontSize: "16px", 
                background: "#f5f5f5", 
                padding: "8px 12px", 
                display: "block", 
                textAlign: "center", 
                margin: "12px 0", 
                border: "1px solid #d9d9d9", 
                borderRadius: "4px"                
              }}>
                {password || "No password generated"}
              </code>
              
              <p style={{ color: "#ff4d4f", fontSize: "12px", margin: 0 }}>
                Warning: This password is only temporary and will not be shown again. Please copy it now and provide it to the employee securely.
              </p>
            </div>
          }
        />
      </div>
    </Modal>
  );
}

export default PasswordUser;
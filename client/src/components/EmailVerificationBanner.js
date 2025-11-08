import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FiMail, FiX, FiCheckCircle, FiRefreshCw } from 'react-icons/fi';
import toast from 'react-hot-toast';
import './EmailVerificationBanner.css';

const EmailVerificationBanner = () => {
  const { currentUser, isEmailVerified, sendVerificationEmail, refreshUserData } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);

  // Don't show if verified or dismissed
  if (isEmailVerified || dismissed || !currentUser) {
    return null;
  }

  const handleSendVerification = async () => {
    setSending(true);
    try {
      await sendVerificationEmail();
      toast.success('Verification email sent! Check your inbox and click the verification link.', {
        duration: 6000,
        icon: '📧'
      });
      // Reload user to check verification status after a delay
      setTimeout(async () => {
        try {
          await currentUser.reload();
          await refreshUserData();
        } catch (reloadError) {
          console.error('Error reloading user:', reloadError);
        }
      }, 3000);
    } catch (error) {
      console.error('Error sending verification email:', error);
      toast.error(error.message || 'Failed to send verification email. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="email-verification-banner">
      <div className="banner-content">
        <div className="banner-icon">
          <FiMail />
        </div>
        <div className="banner-text">
          <h3>Verify Your Email</h3>
          <p>Please verify your email address to create projects, events, and discussions. Check your inbox for the verification link.</p>
        </div>
        <div className="banner-actions">
          <button
            onClick={handleSendVerification}
            disabled={sending}
            className="resend-btn"
          >
            {sending ? (
              <>
                <FiRefreshCw className="spinning" /> Sending...
              </>
            ) : (
              <>
                <FiMail /> Resend Email
              </>
            )}
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="dismiss-btn"
            title="Dismiss"
          >
            <FiX />
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationBanner;


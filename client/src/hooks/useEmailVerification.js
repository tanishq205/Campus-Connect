import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export const useEmailVerification = () => {
  const { isEmailVerified, currentUser } = useAuth();

  const requireVerification = (actionName = 'perform this action') => {
    if (!isEmailVerified) {
      toast.error(`Please verify your email to ${actionName}. Check your inbox for the verification link.`, {
        duration: 5000,
        icon: '📧'
      });
      return false;
    }
    return true;
  };

  return {
    isEmailVerified,
    requireVerification,
    canCreate: isEmailVerified,
    canEdit: isEmailVerified
  };
};


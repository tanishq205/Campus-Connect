import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut, sendEmailVerification } from 'firebase/auth';
import { auth } from '../config/firebase';
import api from '../config/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          // Verify user with backend and sync email verification status
          const response = await api.post('/auth/verify', {
            uid: user.uid,
            email: user.email,
            name: user.displayName || user.email?.split('@')[0],
            emailVerified: user.emailVerified
          });
          
          // Update backend with current Firebase email verification status
          const userData = response.data.user;
          // The verify endpoint already updates emailVerified, so we just use the response
          setUserData({ ...userData, emailVerified: user.emailVerified });
          
          // Refresh user data to get updated info
          if (userData?._id) {
            const updatedUser = await api.get(`/users/${userData._id}`);
            setUserData({ ...updatedUser.data, emailVerified: user.emailVerified });
          }
        } catch (error) {
          console.error('Error verifying user:', error);
        }
      } else {
        setCurrentUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const sendVerificationEmail = async () => {
    if (!currentUser) return;
    try {
      await sendEmailVerification(currentUser);
      return true;
    } catch (error) {
      console.error('Error sending verification email:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setCurrentUser(null);
      setUserData(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const refreshUserData = useCallback(async () => {
    if (currentUser) {
      try {
        const response = await api.get(`/users/uid/${currentUser.uid}`);
        setUserData({ ...response.data, emailVerified: currentUser.emailVerified });
      } catch (error) {
        console.error('Error refreshing user data:', error);
      }
    }
  }, [currentUser]);

  // Periodically check email verification status
  useEffect(() => {
    if (!currentUser || currentUser.emailVerified) return;

    const checkInterval = setInterval(async () => {
      try {
        await currentUser.reload();
        if (currentUser.emailVerified) {
          // User verified their email, refresh data
          await refreshUserData();
        }
      } catch (error) {
        console.error('Error checking verification status:', error);
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(checkInterval);
  }, [currentUser, refreshUserData]);

  const value = {
    currentUser,
    userData,
    signOut,
    refreshUserData,
    sendVerificationEmail,
    loading,
    isEmailVerified: currentUser?.emailVerified || userData?.emailVerified || false,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};


import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Animated, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { User } from '../types';
import UserIcon from './icons/UserIcon';
import SirenIcon from './icons/SirenIcon';
import { registerCitizen, loginCitizen, registerPolice, loginPolice } from '../backend';

interface LoginViewProps {
  onLogin: (user: User) => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [step, setStep] =useState<'role' | 'citizenLoginMethod' | 'mobileInput' | 'otpInput' | 'passwordLogin' | 'policeLogin'>('role');
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  
  const [policeAuthMode, setPoliceAuthMode] = useState<'login' | 'register'>('login');
  const [policeName, setPoliceName] = useState('');
  const [policeDesignation, setPoliceDesignation] = useState('');
  const [policeBadgeNumber, setPoliceBadgeNumber] = useState('');
  const [policePhoneNumber, setPolicePhoneNumber] = useState('');

  const toastAnim = useRef(new Animated.Value(-150)).current;

  useEffect(() => {
    // This effect can be used to trigger the animation
  }, []);

  const showOtpToast = () => {
    Animated.sequence([
      Animated.timing(toastAnim, {
        toValue: 20,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(5000),
      Animated.timing(toastAnim, {
        toValue: -150,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleGuestLogin = () => {
    onLogin({ mobile: 'Guest User', role: 'citizen' });
  };

  // FIX: Removed event parameter from handler to match React Native's onPress signature.
  const handleSendOtp = () => {
    if (!/^\d{10}$/.test(mobileNumber)) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    setError('');
    setIsSendingOtp(true);
    
    setTimeout(() => {
        const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
        setGeneratedOtp(newOtp);
        setIsSendingOtp(false);
        setStep('otpInput');
        showOtpToast();
    }, 1500);
  };

  // FIX: Removed event parameter from handler to match React Native's onPress signature.
  const handleVerifyOtp = () => {
    if (otp === generatedOtp) {
      onLogin({ mobile: mobileNumber, role: 'citizen' });
    } else {
      setError('Invalid OTP. Please try again.');
    }
  };

  // FIX: Removed event parameter from handler to match React Native's onPress signature.
  const handlePasswordLogin = async () => {
    setError('');
    if (!username || !password) {
        setError('Please enter both username and password.');
        return;
    }
    
    setIsLoading(true);
    try {
        const user = await loginCitizen(username, password);
        onLogin({ mobile: user.username, role: 'citizen' });
    } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
        setIsLoading(false);
    }
  };

  // FIX: Removed event parameter from handler to match React Native's onPress signature.
  const handleRegister = async () => {
    setError('');
    if (!username || !password) {
      setError('Please enter both username and password to register.');
      return;
    }
    
    setIsLoading(true);
    try {
        const newUser = await registerCitizen(username, password);
        onLogin({ mobile: newUser.username, role: 'citizen' });
    } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
        setIsLoading(false);
    }
  };

  // FIX: Removed event parameter from handler to match React Native's onPress signature.
  const handlePoliceRegister = async () => {
    setError('');
    if (!policeName || !policeDesignation || !policeBadgeNumber || !policePhoneNumber) {
        setError('Please fill in all fields.');
        return;
    }

    setIsLoading(true);
    try {
        const newOfficer = await registerPolice({
            name: policeName,
            designation: policeDesignation,
            badgeNumber: policeBadgeNumber,
            phoneNumber: policePhoneNumber,
        });
        onLogin({ mobile: newOfficer.badgeNumber, role: 'police' });
    } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
        setIsLoading(false);
    }
  };

  // FIX: Removed event parameter from handler to match React Native's onPress signature.
  const handlePoliceBadgeLogin = async () => {
    setError('');
    if (!policeBadgeNumber) {
        setError('Please enter your badge number.');
        return;
    }

    setIsLoading(true);
    try {
        const officer = await loginPolice(policeBadgeNumber);
        console.log('loginview: login police done. invoke login in provider');
        onLogin({ mobile: officer.badgeNumber, role: 'police' });
    } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
        setIsLoading(false);
    }
  };

  const renderRoleSelection = () => (
     <View style={styles.buttonGroup}>
        <TouchableOpacity
            style={[styles.roleButton, styles.citizenButton]}
            onPress={() => setStep('citizenLoginMethod')}
        >
            <UserIcon width={64} height={64} color="#fff" />
            <Text style={styles.roleButtonText}>I am a Citizen</Text>
        </TouchableOpacity>
        <TouchableOpacity
            style={[styles.roleButton, styles.policeButton]}
            onPress={() => { setStep('policeLogin'); setError(''); }}
        >
             <SirenIcon width={64} height={64} color="#e2e8f0" />
             <Text style={[styles.roleButtonText, {color: '#e2e8f0'}]}>I am a Police Officer</Text>
        </TouchableOpacity>
    </View>
  );

  const renderCitizenLoginMethodSelection = () => (
    <View>
        <Text style={styles.titleSmall}>Citizen Login</Text>
        <View style={styles.buttonGroup}>
            <TouchableOpacity style={styles.buttonPrimary} onPress={() => setStep('mobileInput')}>
                <Text style={styles.buttonText}>Login with Mobile OTP</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.buttonSecondary} onPress={() => setStep('passwordLogin')}>
                <Text style={styles.buttonTextSecondary}>Login with Username/Password</Text>
            </TouchableOpacity>
            <View style={styles.orDivider}>
                <View style={styles.dividerLine} />
                <Text style={styles.orText}>OR</Text>
                <View style={styles.dividerLine} />
            </View>
            <TouchableOpacity style={styles.buttonTertiary} onPress={handleGuestLogin}>
                <Text style={styles.buttonTextTertiary}>Continue as Guest</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setStep('role'); setError(''); }} style={styles.backButton}>
                <Text style={styles.backButtonText}>Back to Role Selection</Text>
            </TouchableOpacity>
        </View>
    </View>
  );

  const renderMobileInput = () => (
    <View>
        <Text style={styles.titleSmall}>Login with OTP</Text>
        <View style={styles.buttonGroup}>
            <TextInput
                style={styles.input}
                placeholder="10-digit mobile number"
                placeholderTextColor="#64748b"
                keyboardType="phone-pad"
                value={mobileNumber}
                onChangeText={setMobileNumber}
                maxLength={10}
                autoFocus
            />
             <TouchableOpacity
                style={[styles.buttonPrimary, isSendingOtp && styles.buttonDisabled]}
                onPress={handleSendOtp}
                disabled={isSendingOtp}
            >
                {isSendingOtp ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send OTP</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setStep('citizenLoginMethod'); setError(''); }} style={styles.backButton}>
                <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );

  const renderOtpInput = () => (
    <View>
        <Text style={styles.titleSmall}>Verify OTP</Text>
        <Text style={styles.subtitle}>Enter the 6-digit code sent to {mobileNumber}.</Text>
        <View style={styles.buttonGroup}>
            <TextInput
                style={[styles.input, { letterSpacing: 8 }]}
                placeholder="6-digit OTP"
                placeholderTextColor="#64748b"
                keyboardType="number-pad"
                value={otp}
                onChangeText={setOtp}
                maxLength={6}
                autoFocus
            />
            <TouchableOpacity style={styles.buttonPrimary} onPress={handleVerifyOtp}>
                <Text style={styles.buttonText}>Verify & Login</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setStep('mobileInput'); setError(''); }} style={styles.backButton}>
                <Text style={styles.backButtonText}>Back to Mobile Entry</Text>
            </TouchableOpacity>
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
  
  const renderPasswordLogin = () => (
    <View>
        <Text style={styles.titleSmall}>{authMode === 'login' ? 'Login with Password' : 'Register Account'}</Text>
        <View style={styles.buttonGroup}>
             <TextInput style={styles.input} placeholder="Username" placeholderTextColor="#64748b" value={username} onChangeText={setUsername} autoCapitalize="none" />
            <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#64748b" value={password} onChangeText={setPassword} secureTextEntry />
             <TouchableOpacity
                style={[styles.buttonPrimary, isLoading && styles.buttonDisabled]}
                onPress={authMode === 'login' ? handlePasswordLogin : handleRegister}
                disabled={isLoading}
            >
                {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{authMode === 'login' ? 'Login' : 'Register'}</Text>}
            </TouchableOpacity>
            <View style={styles.switchAuthContainer}>
                <Text style={styles.switchAuthText}>{authMode === 'login' ? "Don't have an account? " : "Already have an account? "}</Text>
                <TouchableOpacity onPress={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
                    <Text style={styles.switchAuthButtonText}>{authMode === 'login' ? 'Register' : 'Login'}</Text>
                </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => { setStep('citizenLoginMethod'); setError(''); setAuthMode('login'); }} style={styles.backButton}>
                <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );

  const renderPoliceLogin = () => (
    <View>
        <Text style={styles.titleSmall}>{policeAuthMode === 'login' ? 'Police Department Login' : 'Police Officer Registration'}</Text>
        <View style={styles.buttonGroup}>
            {policeAuthMode === 'register' && (
                <>
                    <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor="#64748b" value={policeName} onChangeText={setPoliceName} />
                    <TextInput style={styles.input} placeholder="Designation (e.g., Officer)" placeholderTextColor="#64748b" value={policeDesignation} onChangeText={setPoliceDesignation} />
                </>
            )}
            <TextInput style={styles.input} placeholder="Badge Number" placeholderTextColor="#64748b" value={policeBadgeNumber} onChangeText={setPoliceBadgeNumber} autoCapitalize="none"/>
            {policeAuthMode === 'register' && (
                <TextInput style={styles.input} placeholder="Phone Number" placeholderTextColor="#64748b" value={policePhoneNumber} onChangeText={setPolicePhoneNumber} keyboardType="phone-pad" />
            )}
            <TouchableOpacity
                style={[styles.buttonSecondary, isLoading && styles.buttonDisabled]}
                onPress={policeAuthMode === 'login' ? handlePoliceBadgeLogin : handlePoliceRegister}
                disabled={isLoading}
            >
                {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonTextSecondary}>{policeAuthMode === 'login' ? 'Login' : 'Register'}</Text>}
            </TouchableOpacity>
            <View style={styles.switchAuthContainer}>
                <Text style={styles.switchAuthText}>{policeAuthMode === 'login' ? "Don't have access? " : "Already registered? "}</Text>
                <TouchableOpacity onPress={() => setPoliceAuthMode(policeAuthMode === 'login' ? 'register' : 'login')}>
                    <Text style={styles.switchAuthButtonText}>{policeAuthMode === 'login' ? 'Register here' : 'Login here'}</Text>
                </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => { setStep('role'); setError(''); setPoliceAuthMode('login'); }} style={styles.backButton}>
                <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );

  const renderContent = () => {
    switch(step) {
        case 'citizenLoginMethod': return renderCitizenLoginMethodSelection();
        case 'mobileInput': return renderMobileInput();
        case 'otpInput': return renderOtpInput();
        case 'passwordLogin': return renderPasswordLogin();
        case 'policeLogin': return renderPoliceLogin();
        case 'role': default: return renderRoleSelection();
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{flex: 1}}>
    <ScrollView contentContainerStyle={styles.container}>
      <Animated.View style={[styles.toast, { transform: [{ translateY: toastAnim }] }]}>
          <Text style={styles.toastHeader}>Message from 555-0101</Text>
          <Text style={styles.toastBody}>Your Citizen Safety code is: <Text style={{fontWeight: 'bold'}}>{generatedOtp}</Text></Text>
      </Animated.View>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
            <SirenIcon width={48} height={48} color="#f43f5e" />
            <Text style={styles.title}>Citizen Safety</Text>
            {step === 'role' && <Text style={styles.subtitle}>Please select your role to proceed.</Text>}
        </View>
        {renderContent()}
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    toast: {
        position: 'absolute',
        top: 0,
        backgroundColor: '#f1f5f9',
        padding: 12,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        zIndex: 100,
        width: '90%',
    },
    toastHeader: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#64748b'
    },
    toastBody: {
        color: '#1e293b',
        fontWeight: '500',
        marginTop: 4,
    },
    card: {
        width: '100%',
        maxWidth: 450,
        backgroundColor: '#1e293b',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#334155',
        padding: 32,
    },
    cardHeader: {
        alignItems: 'center',
        marginBottom: 32,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#f1f5f9',
        marginTop: 12,
    },
    titleSmall: {
        fontSize: 20,
        fontWeight: '600',
        color: '#e2e8f0',
        textAlign: 'center',
        marginBottom: 24,
    },
    subtitle: {
        color: '#94a3b8',
        marginTop: 8,
        textAlign: 'center',
        marginBottom: 24,
    },
    buttonGroup: {
        gap: 16,
    },
    roleButton: {
        paddingVertical: 24,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    citizenButton: {
        backgroundColor: '#0ea5e9',
    },
    policeButton: {
        backgroundColor: '#334155',
    },
    roleButtonText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        marginTop: 12,
    },
    buttonPrimary: {
        backgroundColor: '#0ea5e9',
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonSecondary: {
        backgroundColor: '#475569',
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonTertiary: {
        backgroundColor: 'transparent',
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#475569',
    },
    buttonDisabled: {
        backgroundColor: '#475569',
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    buttonTextSecondary: {
        color: '#e2e8f0',
        fontWeight: 'bold',
        fontSize: 16,
    },
    buttonTextTertiary: {
        color: '#94a3b8',
        fontWeight: 'bold',
        fontSize: 16,
    },
    input: {
        backgroundColor: '#0f172a',
        borderWidth: 1,
        borderColor: '#475569',
        borderRadius: 8,
        padding: 12,
        color: '#e2e8f0',
        fontSize: 16,
        textAlign: 'center',
    },
    backButton: {
        padding: 8,
        marginTop: 8,
    },
    backButtonText: {
        color: '#94a3b8',
        textAlign: 'center',
    },
    errorText: {
        color: '#f87171',
        textAlign: 'center',
        marginTop: 16,
    },
    switchAuthContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
    },
    switchAuthText: {
        color: '#94a3b8',
    },
    switchAuthButtonText: {
        color: '#38bdf8',
        fontWeight: '600',
        marginLeft: 4,
    },
    orDivider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 8,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#475569',
    },
    orText: {
        marginHorizontal: 16,
        color: '#94a3b8',
        fontSize: 12,
    },
});

export default LoginView;
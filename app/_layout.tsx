import React, { useEffect, useRef } from 'react';
import { BackHandler, ToastAndroid, Platform } from 'react-native';
import { Stack, useRouter, usePathname, useGlobalSearchParams } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GlobalProvider, useGlobalContext } from '../context/GlobalProvider';
import Header from '../components/Header';

// Main layout component that handles authentication redirects.
function AppLayout() {
    const { currentUser, logout } = useGlobalContext();
    const router = useRouter();
    const pathname = usePathname();
    const params = useGlobalSearchParams(); // FIX: Use global params in the layout route
    const backHandlerCount = useRef(0);

    useEffect(() => {
        const isAuthRoute = pathname === '/citizen' || pathname === '/police';

        if (!currentUser && isAuthRoute) {
            // User is not logged in but trying to access a protected route
            router.replace('/');
        } else if (currentUser && pathname === '/') {
            // User is logged in but on the login screen
            router.replace(currentUser.role === 'citizen' ? '/citizen' : '/police');
        }
    }, [currentUser, pathname, router]);

    // Handle Android back button press
    useEffect(() => {
        const onBackPress = () => {
            // First, handle navigation from sub-views (like history or active alert)
            // back to the main screen for that role. The `params.view` check is key.
            if ((pathname === '/citizen' || pathname === '/police') && params.view) {
                router.replace(pathname); // Navigates to the path without any query params.
                return true; // We've handled the back press.
            }

            // If we are on a true "home screen" (no params), then handle logout confirmation.
            const isHomeScreen = (pathname === '/citizen' || pathname === '/police') && !params.view;
            if (isHomeScreen) {
                // If back is pressed twice within 2 seconds on a home screen, logout.
                if (backHandlerCount.current === 0) {
                    backHandlerCount.current = 1;
                    ToastAndroid.show('Press back again to logout', ToastAndroid.SHORT);

                    // Reset the counter after 2 seconds
                    setTimeout(() => {
                        backHandlerCount.current = 0;
                    }, 2000);
                } else {
                    logout();
                }
                return true; // Prevent default behavior (exiting app)
            }

            // Fallback for any other screen. If the router can go back, let it.
            if (router.canGoBack()) {
                router.back();
                return true;
            }

            // If on the login screen or cannot go back, allow the app to exit.
            return false;
        };

        // This feature is Android-specific.
        if (Platform.OS === 'android') {
            const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
            return () => backHandler.remove();
        }
    }, [pathname, router, logout, currentUser, params]);


    return (
        <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen
                name="citizen"
                options={{ header: () => <Header currentUser={currentUser} onLogout={logout} /> }}
            />
            <Stack.Screen
                name="police"
                options={{ header: () => <Header currentUser={currentUser} onLogout={logout} /> }}
            />
        </Stack>
    );
}

export default function RootLayout() {
    return (
        <SafeAreaProvider>
        <>
            <GlobalProvider>
                <AppLayout />
            </GlobalProvider>
        </>
        </SafeAreaProvider>
    );
}
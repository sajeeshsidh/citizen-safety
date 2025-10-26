import React, { useEffect, useRef } from 'react';
import { BackHandler, ToastAndroid, Platform } from 'react-native';
import { Stack, useRouter, usePathname, useGlobalSearchParams } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GlobalProvider, useGlobalContext } from '../context/GlobalProvider';
import Header from '../components/Header';
import * as Notifications from 'expo-notifications';

// Define a type for the listener object returned by add...Listener functions
// This object simply has a 'remove' method.
type NotificationListener = { remove: () => void } | null;


// Configure notification handling behavior
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

// Main layout component that handles authentication redirects.
function AppLayout() {
    const { currentUser, logout } = useGlobalContext();
    const router = useRouter();
    const pathname = usePathname();
    const params = useGlobalSearchParams(); // FIX: Use global params in the layout route
    const backHandlerCount = useRef(0);

    // FIX: Use the custom defined type (NotificationListener) to avoid using the deprecated or unexported type.
    const notificationListener = useRef<NotificationListener>(null);
    const responseListener = useRef<NotificationListener>(null);

    useEffect(() => {
        // This listener is fired whenever a notification is received while the app is foregrounded
        // The add...Listener functions return an object with a .remove() method
        // which we've now correctly typed using the custom NotificationListener type.
        const receivedListener = Notifications.addNotificationReceivedListener(notification => {
            console.log("Notification received while app is foregrounded:", notification);
        });

        // We set the current property of the ref to the listener object returned by the function.
        notificationListener.current = receivedListener;

        // This listener is fired whenever a user taps on or interacts with a notification 
        const responseHandler = Notifications.addNotificationResponseReceivedListener(response => {
            console.log("Notification response received:", response);
            if (currentUser?.role === 'police') {
                router.replace('/police');
            }
        });

        // We set the current property of the ref to the listener object returned by the function.
        responseListener.current = responseHandler;


        return () => {
            // Cleanup: Use the modern listener.remove() method
            notificationListener.current?.remove();
            responseListener.current?.remove();
        };
    }, [currentUser, router]);


    useEffect(() => {
        const isAuthRoute = ['/citizen', '/police', '/firefighter', '/profile'].includes(pathname);
        if (!currentUser && isAuthRoute) {
            router.replace('/');
        } else if (currentUser && pathname === '/') {
            if (currentUser.role === 'citizen') {
                router.replace('/citizen');
            } else if (currentUser.role === 'police') {
                router.replace('/police');
            } else if (currentUser.role === 'firefighter') {
                router.replace('/firefighter');
            }
        }
    }, [currentUser, pathname, router]);

    // Handle Android back button press
    useEffect(() => {
        const onBackPress = () => {
            if (pathname === '/') {
                // If we are on a sub-view of the login page (e.g., otpInput), and can go back, then go back.
                if (params.view && params.view !== 'role' && router.canGoBack()) {
                    router.back();
                    return true; // We've handled the back press.
                }
                // If on the initial role selection screen, or cannot go back, allow the app to exit.
                return false;
            }
            // First, handle navigation from sub-views (like history or active alert)
            // back to the main screen for that role. The `params.view` check is key.
            if ((pathname === '/citizen' || pathname === '/police') && params.view) {
                router.replace(pathname); // Navigates to the path without any query params.
                return true; // We've handled the back press.
            }

            // If we are on a true "home screen" (no params), then handle logout confirmation.
            const isHomeScreen = ['/citizen', '/police', '/firefighter', '/profile'].some(p => pathname.startsWith(p)) && !params.view;
            if (isHomeScreen) {
                if (router.canGoBack()) {
                    router.back();
                    return true;
                }
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
            //if (router.canGoBack()) {
            //    router.back();
            //    return true;
            //}

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
            <Stack.Screen
                name="firefighter"
                options={{ header: () => <Header currentUser={currentUser} onLogout={logout} /> }}
            />
            <Stack.Screen
                name="profile"
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
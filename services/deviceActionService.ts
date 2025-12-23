
import type { SimulatedFunctionCall } from '../types';

// A mapping of common app names to their URL schemes.
// This is not exhaustive and may not work on all devices/OSs.
// Keys should be lowercase and without spaces.
const appUrlSchemes: Record<string, string> = {
    'whatsapp': 'whatsapp://',
    'spotify': 'spotify://',
    'youtube': 'youtube://',
    'facebook': 'fb://',
    'messenger': 'fb-messenger://',
    'instagram': 'instagram://',
    'twitter': 'twitter://',
    'x': 'twitter://', // Alias for Twitter
    'contacts': 'tel:',
    'phone': 'tel:',
    'messages': 'sms:',
    'sms': 'sms:',
    'mail': 'mailto:',
    'email': 'mailto:',
    'chrome': 'googlechrome://',
    'googlechrome': 'googlechrome://',
    'maps': 'comgooglemaps://',
    'googlemaps': 'comgooglemaps://',
    'slack': 'slack://',
    'discord': 'discord://',
    'netflix': 'nflx://',
    'amazon': 'aiv://', // Amazon Prime Video
    'primevideo': 'aiv://'
};


/**
 * Attempts to execute a device action. For some actions like opening apps,
 * it tries to use URL schemes. For others, it simulates the action.
 * @param action The function call from the Gemini model.
 * @returns A promise that resolves with the result of the action.
 */
export async function executeDeviceAction(action: SimulatedFunctionCall): Promise<{ success: boolean; result: string }> {
    const { name, args } = action;

    switch (name) {
        case 'openApp': {
            const appNameToOpen = (args.appName || '').trim();
            // Normalize the app name for lookup and generation: lowercase, no spaces.
            const normalizedAppName = appNameToOpen.toLowerCase().replace(/\s/g, '');

            let scheme: string | null = null;
            
            // 1. Check our reliable, hardcoded list first.
            // This allows for aliases (e.g., 'x' for 'twitter') and non-standard schemes.
            if (appUrlSchemes[normalizedAppName]) {
                scheme = appUrlSchemes[normalizedAppName];
            } else {
                // 2. If not in the list, generate a plausible scheme as a fallback guess.
                // This is the part that tries to open *any* app by name.
                scheme = `${normalizedAppName}://`;
            }
            
            try {
                // Attempt to open the app via its URL scheme. Using '_self' can sometimes
                // be more reliable than '_blank' for schemes on mobile.
                window.open(scheme, '_self');
                
                // We can't know for sure if this worked due to browser security.
                // The result string should reflect this is an attempt.
                return { success: true, result: `Okay, I'm attempting to open ${appNameToOpen}.` };
            } catch (e) {
                console.error(`Failed to attempt opening app ${appNameToOpen} with scheme ${scheme}`, e);
                return { success: false, result: `I encountered an error trying to open ${appNameToOpen}.` };
            }
        }

        case 'toggleSystemFeature':
            // This is a simulation as web apps cannot control these settings.
            return { success: true, result: `Simulated turning ${args.feature} ${args.enabled ? 'on' : 'off'}.` };

        case 'setSystemLevel':
            // This is a simulation.
            return { success: true, result: `Simulated setting ${args.feature} to ${args.level}%.` };

        case 'navigate':
            return { success: true, result: `Simulated navigating to ${args.destination}.` };
        
        case 'typeText':
            return { success: true, result: `Simulated typing the text: "${args.text}"`};

        case 'screenGesture':
             return { success: true, result: `Simulated a ${args.gesture} gesture.`};
            
        default:
            return { success: false, result: `Action '${name}' is not recognized or cannot be performed.` };
    }
}
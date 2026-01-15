import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';


export const NotificationService = {
  init() {
    if (Platform.OS !== 'web') {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });

      Notifications.addNotificationReceivedListener(notification => {
        const content = notification.request.content;
        const title = content.title || 'Reminder';
        const body = content.body || '';
        if (body) {
          Alert.alert(title, body);
        }
      });
    }
  },

  async registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
        audioAttributes: {
          usage: Notifications.AndroidAudioUsage.NOTIFICATION,
        },
      });
    }

    if (Device.isDevice || Platform.OS === 'android' || Platform.OS === 'ios') {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }
      // token = (await Notifications.getExpoPushTokenAsync()).data;
      // console.log(token);
    } else {
      console.log('Must use physical device for Push Notifications');
    }

    return token;
  },

  async scheduleNotification(title: string, body: string, trigger: any) {
    try {
        const content: any = {
            title,
            body,
            sound: 'default',
        };
        
        if (Platform.OS === 'android') {
            content.priority = Notifications.AndroidNotificationPriority.HIGH;
            content.color = '#FF231F7C';
            content.channelId = 'default';
        }

        let actualTrigger: any = trigger;
        if (trigger instanceof Date) {
            const diffMs = trigger.getTime() - Date.now();
            const seconds = Math.max(1, Math.floor(diffMs / 1000));
            actualTrigger = { seconds };
        }

        const id = await Notifications.scheduleNotificationAsync({
            content,
            trigger: actualTrigger,
        });
        return id;
    } catch (e) {
        console.error("Error scheduling notification", e);
        return null;
    }
  },

  async cancelNotification(notificationId: string) {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
  },

  async cancelAllNotifications() {
      await Notifications.cancelAllScheduledNotificationsAsync();
  }
};

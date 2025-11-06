
import React from 'react';
import { Notification as NotificationType } from '../types';
import Notification from './Notification';

interface NotificationContainerProps {
    notifications: NotificationType[];
    onDismiss: (id: number) => void;
}

const NotificationContainer: React.FC<NotificationContainerProps> = ({ notifications, onDismiss }) => {
    return (
        <div className="fixed top-4 right-4 z-[100] w-full max-w-sm space-y-3">
            {notifications.map(notification => (
                <Notification
                    key={notification.id}
                    notification={notification}
                    onDismiss={onDismiss}
                />
            ))}
        </div>
    );
};

export default NotificationContainer;

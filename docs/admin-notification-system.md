# Admin Notification System

## Current behavior

- The admin header shows the notification bell next to logout.
- The notification panel supports unread count, settings, MP3 sound selection, click-to-read behavior, pruning, and pagination.
- Order and inquiry notification list icons are shown without black rounded background wrappers.
- Icon colors remain type-specific: order notifications use a blue cart icon and inquiry notifications use a green message icon.

## Settings

- Notification settings are controlled through the admin notification hook and persisted locally.
- Sounds use `/sounds/notification1.mp3` through `/sounds/notification5.mp3`.
- The test sound action previews the currently selected sound without creating a notification.

## Verification

- TypeScript check should pass with `apps\web\node_modules\.bin\tsc.cmd -p apps\web\tsconfig.json --noEmit --pretty false`.
- Live realtime toast/sound should still be verified after deployment if Supabase realtime publication settings change.

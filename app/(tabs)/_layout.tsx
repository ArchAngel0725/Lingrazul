import { Text } from 'react-native';
import { Tabs } from 'expo-router';
import { usePreferences } from '../../lib/preferences';
import { useIsNarrow } from '../../lib/responsive';

// shortTitle is used on narrow/phone-width screens - with 7 tabs across
// the top, the full labels ("Flash Cards", "Report Bug", "Community")
// don't fit a ~360-430px viewport without wrapping or clipping.
//
// icon is a plain emoji glyph rather than an icon-font component - this
// project has no icon library installed (no @expo/vector-icons in
// package.json/node_modules, and npm installs are flaky in this sandbox -
// see AGENTS.md's environment quirks), and expo-router's default tab
// rendering with no tabBarIcon at all was showing a broken-image glyph on
// mobile web. A native Text emoji renders everywhere (iOS/Android/web)
// with zero new dependencies.
const TAB_CONFIG: { name: string; title: string; shortTitle: string; icon: string }[] = [
  { name: 'index', title: 'Home', shortTitle: 'Home', icon: '🏠' },
  { name: 'stats', title: 'Stats', shortTitle: 'Stats', icon: '📊' },
  { name: 'learn', title: 'Basics', shortTitle: 'Basics', icon: '📖' },
  { name: 'community', title: 'Community', shortTitle: 'Comm.', icon: '💬' },
  { name: 'offline', title: 'Flash Cards', shortTitle: 'Cards', icon: '🎴' },
  { name: 'report', title: 'Report Bug', shortTitle: 'Report', icon: '🐞' },
  { name: 'settings', title: 'Settings', shortTitle: 'Settings', icon: '⚙️' },
];

export default function TabLayout() {
  const { colors } = usePreferences();
  const isNarrow = useIsNarrow();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarPosition: 'top',
        tabBarStyle: {
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
          borderBottomWidth: 1,
        },
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textFaint,
        // Smaller label text + tighter horizontal padding so all 7 tabs
        // fit on one line at phone width instead of wrapping/clipping.
        tabBarLabelStyle: isNarrow ? { fontSize: 10 } : undefined,
        tabBarItemStyle: isNarrow ? { paddingHorizontal: 2 } : undefined,
      }}
    >
      {TAB_CONFIG.map(tab => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: isNarrow ? tab.shortTitle : tab.title,
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: isNarrow ? 14 : 16, color }}>{tab.icon}</Text>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

import { Tabs } from 'expo-router';
import { usePreferences } from '../../lib/preferences';
import { useIsNarrow } from '../../lib/responsive';

// shortTitle is used on narrow/phone-width screens - with 7 tabs across
// the top, the full labels ("Flash Cards", "Report Bug", "Community")
// don't fit a ~360-430px viewport without wrapping or clipping.
const TAB_CONFIG: { name: string; title: string; shortTitle: string }[] = [
  { name: 'index', title: 'Home', shortTitle: 'Home' },
  { name: 'stats', title: 'Stats', shortTitle: 'Stats' },
  { name: 'learn', title: 'Basics', shortTitle: 'Basics' },
  { name: 'community', title: 'Community', shortTitle: 'Comm.' },
  { name: 'offline', title: 'Flash Cards', shortTitle: 'Cards' },
  { name: 'report', title: 'Report Bug', shortTitle: 'Report' },
  { name: 'settings', title: 'Settings', shortTitle: 'Settings' },
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
          options={{ title: isNarrow ? tab.shortTitle : tab.title }}
        />
      ))}
    </Tabs>
  );
}

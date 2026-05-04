import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Fonts, Shadow } from '@/constants/design';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: c.accentFg,
        tabBarInactiveTintColor: c.tabInactive,
        headerShown: false,
        tabBarButton: HapticTab,
        // Bolzplatz-Style: Bar sitzt flush am unteren Rand (kein Float-Gap),
        // aber behält die Surface-Card-Optik mit weichem Shadow nach oben.
        tabBarStyle: {
          backgroundColor: c.surface,
          borderTopColor: c.border,
          borderTopWidth: 0.5,
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          ...Shadow.md,
        },
        tabBarLabelStyle: {
          fontFamily: Fonts.display.bold,
          fontSize: 10,
          letterSpacing: -0.1,
          marginTop: 4,
        },
        tabBarItemStyle: {
          paddingTop: 4,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <PillIcon focused={focused} c={c} icon="house.fill" />
          ),
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: 'Spielplan',
          tabBarIcon: ({ focused }) => (
            <PillIcon focused={focused} c={c} icon="list.bullet" />
          ),
        }}
      />
      <Tabs.Screen
        name="my-tips"
        options={{
          title: 'Meine Tipps',
          tabBarIcon: ({ focused }) => (
            <PillIcon focused={focused} c={c} icon="checklist" />
          ),
        }}
      />
      <Tabs.Screen
        name="leagues"
        options={{
          title: 'Ligen',
          tabBarIcon: ({ focused }) => (
            <PillIcon focused={focused} c={c} icon="person.3.fill" />
          ),
        }}
      />
    </Tabs>
  );
}

// Active-State: Icon sitzt in einem accent-Pill. Inactive: nur Icon.
function PillIcon({
  focused,
  c,
  icon,
}: {
  focused: boolean;
  c: (typeof Colors)['light'];
  icon: 'house.fill' | 'list.bullet' | 'checklist' | 'person.3.fill';
}) {
  return (
    <View
      style={{
        width: 28,
        height: 28,
        borderRadius: 999,
        backgroundColor: focused ? c.accent : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <IconSymbol size={16} name={icon} color={focused ? c.accentFg : c.tabInactive} />
    </View>
  );
}

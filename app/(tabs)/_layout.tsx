// Tabbar 文档 https://docs.expo.dev/router/advanced/tabs/
// https://reactnavigation.org/docs/bottom-tab-navigator/?config=static#options
import { Tabs } from 'expo-router'
import React from 'react'
import { Platform } from 'react-native'
import { HapticTab } from '@/components/HapticTab'
import TabBarBackground from '@/components/ui/TabBarBackground'
import { Colors } from '@/constants/Colors'
// import { useColorScheme } from 'react-native'
import { Icon } from '@/assets/icon'
// 定义图标组件
const TabIcon: React.FC<{
  focused: boolean
  color: string
  icon: React.ComponentType<any>
  activeIcon: React.ComponentType<any>
  size?: number
}> = ({ focused, color, activeIcon, icon, size = 24 }) => {
  const Icon = focused ? activeIcon : icon
  return <Icon width={size} height={size} fill={color} />
}

export default function TabLayout() {
  // const theme = useColorScheme() ?? 'light'

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.tint,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          android: {},
          ios: {
            // Use a transparent background on iOS to show the blur effect
            position: 'absolute',
          },
          default: {
            minHeight: 54,
            backgroundColor: 'transparent',
          },
        }),
        tabBarLabelStyle: {
          minWidth: 36,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '聊天',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              focused={focused}
              color={color}
              icon={Icon.Chat}
              activeIcon={Icon.ChatActive}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="note"
        options={{
          title: '笔记',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              focused={focused}
              color={color}
              icon={Icon.Note}
              activeIcon={Icon.NoteActive}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          title: '探索',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              focused={focused}
              color={color}
              icon={Icon.Explore}
              activeIcon={Icon.ExploreActive}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="mine"
        options={{
          title: '我的',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              focused={focused}
              color={color}
              icon={Icon.Mine}
              activeIcon={Icon.MineActive}
            />
          ),
        }}
      />
    </Tabs>
  )
}

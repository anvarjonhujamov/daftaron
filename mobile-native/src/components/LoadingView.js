import React from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'

export default function LoadingView({ label = 'Yuklanmoqda...' }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#3B82F6" />
      <Text style={styles.label}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10
  },
  label: {
    color: '#6B7280',
    fontSize: 14
  }
})

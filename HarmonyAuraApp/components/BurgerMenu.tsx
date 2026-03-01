import { View, Text, Pressable, StyleSheet, Switch } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';

export default function BurgerMenu() {
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const router = useRouter();

  if (!open) {
    return (
      <Pressable onPress={() => setOpen(true)}>
        <Text style={styles.icon}>☰</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.menu}>
      <Pressable onPress={() => router.push('/humans')}>
        <Text style={styles.item}>Humans</Text>
      </Pressable>

      <Pressable onPress={() => router.push('/machines')}>
        <Text style={styles.item}>Machines</Text>
      </Pressable>

      <View style={styles.toggle}>
        <Text>Dark Mode</Text>
        <Switch value={dark} onValueChange={setDark} />
      </View>

      <Pressable onPress={() => setOpen(false)}>
        <Text style={styles.close}>Close</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  icon: { fontSize: 26 },
  menu: {
    position: 'absolute',
    top: 50,
    right: 10,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    elevation: 5,
  },
  item: { fontSize: 16, marginBottom: 10 },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  close: { color: 'red', marginTop: 10 },
});

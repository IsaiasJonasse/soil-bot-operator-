import type { PropsWithChildren, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, type TextInputProps, View, type ViewStyle } from 'react-native';

import { colors, radii } from '@/constants/soilbot-theme';

export function Card({ children, style }: PropsWithChildren<{ style?: ViewStyle | ViewStyle[] }>) { return <View style={[styles.card, style]}>{children}</View>; }
export function SectionTitle({ children, aside }: PropsWithChildren<{ aside?: ReactNode }>) { return <View style={styles.sectionRow}><Text style={styles.sectionTitle}>{children}</Text>{aside}</View>; }
export function Button({ label, onPress, secondary = false, disabled = false }: { label: string; onPress: () => void; secondary?: boolean; disabled?: boolean }) {
  return <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, secondary && styles.buttonSecondary, (pressed || disabled) && styles.buttonPressed]}><Text style={[styles.buttonText, secondary && styles.buttonTextSecondary]}>{label}</Text></Pressable>;
}
export function Field({ label, ...props }: TextInputProps & { label: string }) { return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput placeholderTextColor={colors.muted} {...props} style={[styles.input, props.style]} /></View>; }
export function Pill({ label, tone = 'green' }: { label: string; tone?: 'green' | 'amber' | 'cyan' }) { const color = tone === 'amber' ? colors.amber : tone === 'cyan' ? colors.cyan : colors.green; return <View style={[styles.pill, { borderColor: color }]}><View style={[styles.pillDot, { backgroundColor: color }]} /><Text style={[styles.pillText, { color }]}>{label}</Text></View>; }

const styles = StyleSheet.create({
  card: { backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, borderRadius: radii.lg, padding: 20 }, sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }, sectionTitle: { color: colors.text, fontWeight: '800', fontSize: 16 },
  button: { minHeight: 48, paddingHorizontal: 20, borderRadius: radii.md, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' }, buttonSecondary: { backgroundColor: colors.panelRaised, borderWidth: 1, borderColor: colors.border }, buttonPressed: { opacity: 0.65 }, buttonText: { color: colors.background, fontWeight: '900', fontSize: 14 }, buttonTextSecondary: { color: colors.text },
  field: { gap: 8, flex: 1, minWidth: 140 }, label: { color: colors.muted, fontSize: 12, fontWeight: '700' }, input: { height: 48, borderRadius: radii.md, backgroundColor: '#0B1815', borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, color: colors.text, fontSize: 14 },
  pill: { borderWidth: 1, borderRadius: radii.pill, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10, paddingVertical: 6 }, pillDot: { width: 6, height: 6, borderRadius: 3 }, pillText: { fontSize: 11, fontWeight: '800' },
});

import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  useWindowDimensions,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from 'react-native';

interface CodeInputProps {
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}

const TOTAL_DIGITS = 12;
const GROUP_SIZE = 4;
const GROUPS = 3;

// Horizontal padding in login.tsx is px-6 = 24px each side = 48px total
const H_PADDING = 48;
// Space between the 3 groups (2 gaps × 20px each)
const GROUP_SEPARATOR = 20;
const NUM_SEPARATORS = GROUPS - 1;

/**
 * 12-digit numeric code input — Optimo-style dash display.
 *
 * Layout is computed from the real screen width so digits NEVER overflow,
 * regardless of device size. Font scales proportionally to the cell width.
 *
 * Architecture:
 *  - One real TextInput, positioned off-screen (1×1px at -9999) so it can
 *    receive focus on both Android and iOS.
 *  - TouchableOpacity overlay calls .focus() on tap.
 *  - 12 visual char slots show digits or em-dashes.
 */
export default function CodeInput({ value, onChange, autoFocus = false }: CodeInputProps) {
  const { width: screenWidth } = useWindowDimensions();
  const inputRef = useRef<TextInput>(null);

  // ─── Layout math ────────────────────────────────────────────────────
  const totalSeparators = NUM_SEPARATORS * GROUP_SEPARATOR;
  const availableWidth = screenWidth - H_PADDING - totalSeparators;
  const cellWidth = Math.floor(availableWidth / TOTAL_DIGITS);
  const fontSize = Math.min(Math.floor(cellWidth * 1.1), 32);
  // ─────────────────────────────────────────────────────────────────────

  const focus = useCallback(() => {
    if (inputRef.current?.isFocused()) {
      inputRef.current.blur();
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      inputRef.current?.focus();
    }
  }, []);

  // Blinking cursor animation — restarts whenever the active position changes
  const blinkAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    blinkAnim.setValue(1);
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [value.length, blinkAnim]);

  useEffect(() => {
    if (autoFocus) {
      const t = setTimeout(focus, 400);
      return () => clearTimeout(t);
    }
  }, [autoFocus, focus]);

  const handleChange = (text: string) => {
    const sanitized = text.replace(/\D/g, '').slice(0, TOTAL_DIGITS);
    onChange(sanitized);
  };

  const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (e.nativeEvent.key === 'Backspace' && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={focus}
      className="self-stretch items-center py-2"
      accessibilityLabel="Activation code input — tap to open keyboard"
    >
      {/* Real TextInput — off-screen but 1×1px so Android can focus it */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        onKeyPress={handleKeyPress}
        keyboardType="numeric"
        maxLength={TOTAL_DIGITS}
        caretHidden
        autoCorrect={false}
        autoComplete="off"
        style={styles.hiddenInput}
      />

      {/* Visual display */}
      <View className="flex-row items-center">
        {Array.from({ length: GROUPS }, (_, groupIdx) => (
          <React.Fragment key={groupIdx}>
            {/* Group */}
            <View className="flex-row">
              {Array.from({ length: GROUP_SIZE }, (_, cellIdx) => {
                const idx = groupIdx * GROUP_SIZE + cellIdx;
                const char = value[idx];
                const isFilled = char !== undefined;
                const isActive = idx === value.length;

                return (
                  <View
                    key={idx}
                    style={{ width: cellWidth, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text
                      style={{ fontSize, fontWeight: '700', color: isFilled ? '#FFFFFF' : 'rgba(255,255,255,0.25)' }}
                    >
                      {isFilled ? char : '_'}
                    </Text>
                    {/* Blinking vertical cursor at active position */}
                    {isActive && (
                      <Animated.View
                        style={{
                          position: 'absolute',
                          alignSelf: 'center',
                          width: 2,
                          height: fontSize * 0.8,
                          backgroundColor: '#6EB46E',
                          borderRadius: 1,
                          opacity: blinkAnim,
                        }}
                      />
                    )}
                  </View>
                );
              })}
            </View>

            {/* Group separator */}
            {groupIdx < GROUPS - 1 && (
              <View style={{ width: GROUP_SEPARATOR }} />
            )}
          </React.Fragment>
        ))}
      </View>

      {/* Full-width bottom rule */}
      {/* <View className="self-stretch h-px bg-white/15 mt-2 rounded-full" /> */}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  hiddenInput: {
    position: 'absolute',
    top: -9999,
    left: -9999,
    width: 1,
    height: 1,
    opacity: 0,
  },
});

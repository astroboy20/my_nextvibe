/**
 * VibeTagEditor — Native replacement for the web Vibetags + DesignTemplate + Editor flow.
 *
 * Flow: Start → Templates → Editor (Skia canvas)
 *
 * This component manages the 3-step flow and is the drop-in mobile equivalent of
 * the web components/edit-event/VibetagCreator/vibetag/vibetags.tsx hierarchy.
 */

import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import EditorScreen from './EditorScreen';
import StartScreen from './StartScreen';
import TemplateScreen from './TemplateScreen';
import type { CanvasTemplate } from './types';

type Step = 'start' | 'templates' | 'editor';

interface Props {
  eventId: string;
  activityTiming: string;
  eventName?: string | null;
  onClose: (meta?: { paymentRequired: boolean; vibeTagId?: string }) => void;
}

export default function VibeTagEditor({ eventId, activityTiming, eventName, onClose }: Props) {
  const [step, setStep] = useState<Step>('start');
  const [selectedTemplate, setSelectedTemplate] = useState<CanvasTemplate | null>(null);

  const handleTemplateSelect = (template: CanvasTemplate | null) => {
    setSelectedTemplate(template);
    setStep('editor');
  };

  if (step === 'start') {
    return (
      <ScrollView contentContainerStyle={s.scroll}>
        <StartScreen onDesignWithTemplate={() => setStep('templates')} />
      </ScrollView>
    );
  }

  if (step === 'templates') {
    return (
      <ScrollView contentContainerStyle={s.scroll}>
        <TemplateScreen onSelect={handleTemplateSelect} />
      </ScrollView>
    );
  }

  // step === 'editor'
  return (
    <View style={{ flex: 1 }}>
      <EditorScreen
        template={selectedTemplate}
        activityTiming={activityTiming}
        eventId={eventId}
        eventName={eventName}
        onSaved={(meta) => onClose(meta)}
        onBack={() => setStep('templates')}
      />
    </View>
  );
}

const s = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 40 },
});

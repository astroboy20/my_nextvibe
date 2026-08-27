/**
 * /(auth)/onboarding index — immediately redirects to the vibes step.
 * Additional onboarding steps can be added here later.
 */
import { Redirect } from 'expo-router';

export default function OnboardingIndex() {
  return <Redirect href="/(auth)/onboarding/vibes" />;
}

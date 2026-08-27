/**
 * useAuthModal
 *
 * Simple hook for controlling the AuthModal visibility.
 *
 * Usage:
 *   const { visible, showAuthModal, hideAuthModal } = useAuthModal();
 *
 *   <AuthModal
 *     visible={visible}
 *     onDismiss={hideAuthModal}
 *     onSuccess={() => { hideAuthModal(); retryAction(); }}
 *     message="Sign in to upload your postcard"
 *   />
 */

import { useCallback, useState } from 'react';

export function useAuthModal() {
  const [visible, setVisible] = useState(false);

  const showAuthModal = useCallback(() => setVisible(true), []);
  const hideAuthModal = useCallback(() => setVisible(false), []);

  return { visible, showAuthModal, hideAuthModal };
}

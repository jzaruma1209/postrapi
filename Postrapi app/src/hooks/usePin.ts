import { useState } from "react";

interface UsePinOptions {
  onSuccess: () => void;
  onCancel?: () => void;
}

export function usePin({ onSuccess, onCancel }: UsePinOptions) {
  const [pinVisible, setPinVisible] = useState(false);

  const pedirPin = () => setPinVisible(true);

  const handleSuccess = () => {
    setPinVisible(false);
    onSuccess();
  };

  const handleCancel = () => {
    setPinVisible(false);
    onCancel?.();
  };

  return {
    pinVisible,
    pedirPin,
    handleSuccess,
    handleCancel,
  };
}

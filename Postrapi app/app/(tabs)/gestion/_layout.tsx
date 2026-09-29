import { createContext, useContext, useCallback, useRef, useState } from "react";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import PinModal from "../../../src/components/shared/PinModal";

interface GestionAuthContextType {
  isUnlocked: boolean;
}

const GestionAuthContext = createContext<GestionAuthContextType>({ isUnlocked: false });

export function useGestionAuth() {
  return useContext(GestionAuthContext);
}

export default function GestionLayout() {
  const router = useRouter();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const isUnlockedRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      // Focus: el usuario entró al módulo Gestión (desde otro tab o montaje inicial)
      if (!isUnlockedRef.current) {
        setShowPinModal(true);
      }
      return () => {
        // Blur: el usuario salió del módulo Gestión a otro tab
        isUnlockedRef.current = false;
        setIsUnlocked(false);
        setShowPinModal(false);
      };
    }, [])
  );

  const handlePinSuccess = () => {
    isUnlockedRef.current = true;
    setIsUnlocked(true);
    setShowPinModal(false);
  };

  const handlePinCancel = () => {
    setShowPinModal(false);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  return (
    <GestionAuthContext.Provider value={{ isUnlocked }}>
      <Stack screenOptions={{ headerShown: false }} />
      <PinModal
        visible={showPinModal}
        onSuccess={handlePinSuccess}
        onCancel={handlePinCancel}
        titulo="PIN de Supervisor"
      />
    </GestionAuthContext.Provider>
  );
}

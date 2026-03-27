import React, { useEffect } from 'react';
import * as Google from 'expo-auth-session/providers/google';

type GoogleAuthBootstrapProps = {
  config: {
    clientId?: string;
    androidClientId?: string;
    iosClientId?: string;
  };
  onReady: (request: any, promptAsync: any) => void;
};

export default function GoogleAuthBootstrap({ config, onReady }: GoogleAuthBootstrapProps) {
  const [request, , promptAsync] = Google.useIdTokenAuthRequest(config);

  useEffect(() => {
    onReady(request, promptAsync);
  }, [request, promptAsync, onReady]);

  return null;
}

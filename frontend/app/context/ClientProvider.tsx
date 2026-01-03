'use client';

import dynamic from 'next/dynamic';
import styled, { ThemeProvider } from 'styled-components';
import { ThemeModeType, CsprClickThemes } from '@make-software/csprclick-ui';
import { useState } from 'react';

const ClickProvider = dynamic(
  () => import('@make-software/csprclick-ui').then((mod) => mod.ClickProvider),
  { ssr: false }
);

const ClickUI = dynamic(
  () => import('@make-software/csprclick-ui').then((mod) => mod.ClickUI),
  { ssr: false }
);

// Get appId - must be accessed at runtime, not module level
const getAppId = () => {
  const appId = process.env.NEXT_PUBLIC_CSPR_CLICK_APP_ID;
  if (!appId) {
    console.warn('⚠️ NEXT_PUBLIC_CSPR_CLICK_APP_ID not set! Using fallback.');
    return 'csprclick-template';
  }
  console.log('✅ Using CSPR Click AppID:', appId);
  return appId;
};

const AppTheme = {
  dark: {
    ...CsprClickThemes.dark,
    topBarBackground: '#1A1A24',
    backgroundColor: '#0A0A0F',
  },
};

const TopBarSection = styled.section({
  backgroundColor: '#1A1A24',
  position: 'fixed',
  zIndex: 1000,
  width: '100%',
  top: 0,
  minHeight: '60px',
});

const TopBarContainer = styled.div({
  display: 'flex',
  flexDirection: 'row',
  width: '100%',
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '0 12px',
});

export default function ClientProvider({ children }: { children: React.ReactNode }) {
  const [themeMode] = useState<ThemeModeType>(ThemeModeType.dark);
  const topBarSettings = {};

  // Create options at component level to ensure env var is read at runtime
  const clickOptions = {
    appName: 'CasperLink',
    contentMode: 'iframe',
    providers: ['casper-wallet'],
    appId: getAppId(),
  };

  return (
    <ClickProvider options={clickOptions}>
      <ThemeProvider theme={AppTheme.dark}>
        <TopBarSection>
          <TopBarContainer>
            <ClickUI topBarSettings={topBarSettings} themeMode={themeMode} />
          </TopBarContainer>
        </TopBarSection>
        <div style={{ paddingTop: '80px' }}>{children}</div>
      </ThemeProvider>
    </ClickProvider>
  );
}
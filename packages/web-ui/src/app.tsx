import { ThemeProvider } from '@emotion/react';
import { MotionConfig } from 'framer-motion';
import { RouterProvider } from 'react-router';
import { router } from './routes/router';
import { GlobalStyles } from './theme/global-styles';
import { theme } from './theme/theme';

/** The root of the dashboard: the theme, the motion settings, and the router. */
export function App() {
  return (
    <ThemeProvider theme={theme}>
      <MotionConfig reducedMotion="user">
        <GlobalStyles />
        <RouterProvider router={router} />
      </MotionConfig>
    </ThemeProvider>
  );
}

import { Suspense } from 'react';
import VerifyEmail from 'src/sections/auth/VerifyEmail';

export const metadata = { title: 'Verifikacija email adrese' };

export default function VerifikacijaPage() {
  return (
    <Suspense>
      <VerifyEmail />
    </Suspense>
  );
}

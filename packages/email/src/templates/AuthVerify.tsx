import { Body, Container, Head, Heading, Html, Link, Preview, Section, Text } from '@react-email/components';

export interface AuthVerifyProps { verifyUrl: string; locale: string; }

export default function AuthVerify({ verifyUrl, locale }: AuthVerifyProps) {
  return (
    <Html lang={locale}>
      <Head />
      <Preview>Verify your ApexPredict AI email address</Preview>
      <Body style={{ background: '#0A0A0A', color: '#FAFAFA', fontFamily: 'Inter, sans-serif' }}>
        <Container style={{ padding: 32, maxWidth: 520 }}>
          <Heading as="h1" style={{ color: '#22D3EE' }}>Verify your email</Heading>
          <Text>Confirm this address to finish setting up your ApexPredict AI account.</Text>
          <Section style={{ margin: '32px 0' }}>
            <Link href={verifyUrl} style={{ background: '#22D3EE', color: '#0A0A0A', padding: '14px 24px', borderRadius: 12, fontWeight: 600, textDecoration: 'none' }}>
              Verify email
            </Link>
          </Section>
          <Text style={{ color: '#A1A1AA', fontSize: 12 }}>
            If the button does not work, paste this link into your browser: {verifyUrl}
          </Text>
          <Text style={{ color: '#A1A1AA', fontSize: 12 }}>
            ApexPredict AI is a sports prediction analytics service. We are not a bookmaker. 18+ only.{' '}
            <Link href="https://apexpredix.ai/unsubscribe" style={{ color: '#A1A1AA', textDecoration: 'underline' }}>Unsubscribe</Link>.{' '}
            Need a break?{' '}
            <Link href="https://apexpredix.ai/legal/responsible-gaming" style={{ color: '#A1A1AA', textDecoration: 'underline' }}>Visit our responsible-gaming page</Link>.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

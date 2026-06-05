import { Body, Container, Head, Heading, Html, Link, Preview, Section, Text } from '@react-email/components';

export interface WaitlistWelcomeProps { referralUrl: string; locale: string; }

export default function WaitlistWelcome({ referralUrl, locale }: WaitlistWelcomeProps) {
  return (
    <Html lang={locale}>
      <Head />
      <Preview>You are in. Share your referral link.</Preview>
      <Body style={{ background: '#0A0A0A', color: '#FAFAFA', fontFamily: 'Inter, sans-serif' }}>
        <Container style={{ padding: 32, maxWidth: 520 }}>
          <Heading as="h1" style={{ color: '#22D3EE' }}>You are on the list.</Heading>
          <Text>Share your link to move up the queue.</Text>
          <Section style={{ background: '#18181B', padding: 16, borderRadius: 12, margin: '24px 0' }}>
            <Link href={referralUrl} style={{ color: '#22D3EE' }}>{referralUrl}</Link>
          </Section>
          <Text style={{ color: '#A1A1AA', fontSize: 12 }}>
            ApexPredix AI is a sports prediction analytics service. We are not a bookmaker. 18+ only.{' '}
            <Link href="https://apexpredix.ai/unsubscribe" style={{ color: '#A1A1AA', textDecoration: 'underline' }}>Unsubscribe</Link>.{' '}
            Need a break?{' '}
            <Link href="https://apexpredix.ai/legal/responsible-gaming" style={{ color: '#A1A1AA', textDecoration: 'underline' }}>Visit our responsible-gaming page</Link>.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

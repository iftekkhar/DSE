import axios from 'axios';

async function checkRender() {
  console.log('Checking Render deployment...');
  for (let i = 0; i < 15; i++) {
    try {
      const res = await axios.get('https://dse-xvn2.onrender.com/api/stocks', { timeout: 8000 });
      const brac = res.data.find(s => s.symbol === 'BRACBANK');
      if (brac && brac.eps !== null) {
        console.log(`\n🎉 Render Deployment LIVE & VERIFIED!`);
        console.log('BRACBANK:', { eps: brac.eps, dailyPe: brac.dailyPe, roe: brac.roe, period: brac.auditedPeriod });
        const bxph = res.data.find(s => s.symbol === 'BXPHARMA');
        console.log('BXPHARMA:', { eps: bxph.eps, dailyPe: bxph.dailyPe, roe: bxph.roe, period: bxph.auditedPeriod });
        const nav = res.data.find(s => s.symbol === 'NAVANAPHAR');
        console.log('NAVANAPHAR:', { eps: nav.eps, dailyPe: nav.dailyPe, roe: nav.roe, period: nav.auditedPeriod });
        process.exit(0);
      } else {
        console.log(`[Attempt ${i + 1}/15] Render still running old container (EPS is null), waiting 12s...`);
      }
    } catch (e) {
      console.log(`[Attempt ${i + 1}/15] Render is restarting container: ${e.message}, waiting 12s...`);
    }
    await new Promise(r => setTimeout(r, 12000));
  }
  console.log('Finished checking Render.');
  process.exit(0);
}

checkRender();

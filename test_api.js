import axios from 'axios';

async function test() {
    const response = await axios.get('https://api.dexscreener.com/latest/dex/search?q=USDT');
    const pairs = response.data.pairs || [];
    console.log(`Found ${pairs.length} pairs`);
    if (pairs.length > 0) {
        console.log('First pair keys:', Object.keys(pairs[0]));
    }
}

test();

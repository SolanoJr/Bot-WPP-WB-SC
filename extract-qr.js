const { execSync } = require('child_process');
const fs = require('fs');

// Extrair QR code do log do servidor
try {
    const sshCommand = 'ssh solanojr@100.101.218.16 "cat ~/.pm2/logs/bot-wpp-out.log"';
    const logOutput = execSync(sshCommand, { encoding: 'utf8' });
    
    // Procurar pelo QR code no formato esperado
    const qrMatch = logOutput.match(/2@[^,\s]+/);
    
    if (qrMatch) {
        const qrCode = qrMatch[0];
        console.log('QR Code encontrado:');
        console.log(qrCode);
        
        // Salvar para arquivo
        fs.writeFileSync('server-qr.txt', qrCode);
        console.log('\nQR Code salvo em server-qr.txt');
        
        // Gerar link completo
        const fullLink = `https://wa.me/settings/linked_devices#${qrCode},ad6Ee4bq1MTEuMR6sciCs3o+7cnxKV+BlPdXy1OgKQk=,jpXw4jvKd9w7gkrb599c70OT8FokTXgAsu04C4qORUg=,LK9oaTbP6VLdYV0xMKAtNm8E9+kw6oZ5M52ffsELN9A=,1`;
        console.log('\nLink completo:');
        console.log(fullLink);
        
        fs.writeFileSync('server-qr-link.txt', fullLink);
        console.log('Link salvo em server-qr-link.txt');
    } else {
        console.log('QR Code não encontrado nos logs');
    }
} catch (error) {
    console.error('Erro:', error.message);
}

export const MailTemplates = {
    emailVerification: (code: string) => ({
        subject: "Verificación de correo electrónico",
        html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h1 style="color: #333;">Verifica tu correo electrónico</h1>
                    <p>Hola,</p>
                    <p>Gracias por registrarte en <strong>flAIghts</strong>. Por favor, utiliza el siguiente código para verificar tu cuenta:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #007bff; background-color: #f8f9fa; padding: 10px 20px; border-radius: 5px; border: 1px dashed #007bff;">
                            ${code}
                        </span>
                    </div>
                    <p style="color: #666; font-size: 0.9em;">Este código es válido por tiempo limitado. Si no has solicitado este registro, puedes ignorar este correo de forma segura.</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="color: #999; font-size: 0.8em; text-align: center;">© 2026 flAIghts. Todos los derechos reservados.</p>
                </div>
            `
    }),
    passwordReset: (url: string) => ({
        subject: "Recuperación de contraseña",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h1 style="color: #333;">Recuperación de contraseña</h1>
                <p>Hola,</p>
                <p>Has solicitado restablecer tu contraseña para acceder a <strong>flAIghts</strong>. Haz clic en el botón de abajo para continuar:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${url}" style="padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                        Restablecer contraseña
                    </a>
                </div>
                <p style="color: #666; font-size: 0.9em;">Este enlace expirará en 1 hora. Si no has solicitado este cambio, puedes ignorar este correo de forma segura.</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="color: #999; font-size: 0.8em; text-align: center;">© 2026 flAIghts. Todos los derechos reservados.</p>
            </div>
        `
    })
};

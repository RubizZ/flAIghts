const baseCodeTemplate = (code: string, title: string, description: string, color = "#007bff", isAlert = false, duration = "1 hora") => ({
    subject: title,
    html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h1 style="color: ${isAlert ? '#dc3545' : '#333'};">${title}</h1>
            <p>Hola,</p>
            <p>${description}</p>
            <div style="text-align: center; margin: 30px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: ${color}; background-color: #f8f9fa; padding: 10px 20px; border-radius: 5px; border: 1px dashed ${color};">
                    ${code}
                </span>
            </div>
            ${isAlert
            ? `<p style="color: #dc3545; font-size: 0.9em; font-weight: bold;">Este código es válido por ${duration}. ⚠️ Si no has sido tú quien ha realizado esta solicitud, alguien con acceso a tu cuenta podría haberla iniciado. Te recomendamos que accedas a tu cuenta inmediatamente, cambies tu contraseña y revises tus sesiones activas.</p>`
            : `<p style="color: #666; font-size: 0.9em;">Este código es válido por ${duration}. Si no has solicitado esta acción, puedes ignorar este correo de forma segura.</p>`
        }
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 0.8em; text-align: center;">© 2026 flAIghts. Todos los derechos reservados.</p>
        </div>
    `
});
const baseInfoTemplate = (title: string, description: string, htmlContent: string = "", isAlert = false) => ({
    subject: title,
    html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h1 style="color: ${isAlert ? '#dc3545' : '#333'};">${title}</h1>
            <p>Hola,</p>
            <p>${description}</p>
            ${htmlContent}
            ${isAlert ? '<p style="color: #dc3545; font-size: 0.9em; margin-top: 20px; font-weight: bold;">Si tú no has realizado esta acción, por favor accede a tu cuenta inmediatamente y cambia tu contraseña o contacta con soporte.</p>' : ''}
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 0.8em; text-align: center;">© 2026 flAIghts. Todos los derechos reservados.</p>
        </div>
    `
});

export const MailTemplates = {
    welcomeEmail: () =>
        baseInfoTemplate("¡Bienvenido a flAIghts!", "Tu cuenta ha sido creada y verificada con éxito. Ya puedes empezar a disfrutar de todas las funcionalidades y buscar los mejores vuelos con la ayuda de nuestra inteligencia artificial."),

    securityActionSuccess: (actionName: string) =>
        baseInfoTemplate("Aviso de seguridad: Acción completada", `Te confirmamos que la acción de seguridad <strong>${actionName}</strong> se ha completado con éxito en tu cuenta de flAIghts.`, "", true),
    emailVerification: (code: string, duration: string) =>
        baseCodeTemplate(code, "Verificación de correo electrónico", "Gracias por registrarte en <strong>flAIghts</strong>. Por favor, utiliza el siguiente código para verificar tu cuenta:", "#007bff", false, duration),

    emailChangeSecurity: (code: string, duration: string) =>
        baseCodeTemplate(code, "Asegura tu cuenta", "Has solicitado cambiar el correo electrónico asociado a tu cuenta de <strong>flAIghts</strong>. Por favor, utiliza este código para confirmar que eres tú desde tu <strong>correo actual</strong>:", "#dc3545", true, duration),

    emailChangeVerification: (code: string, duration: string) =>
        baseCodeTemplate(code, "Verifica tu nuevo email", "Estás intentando cambiar tu correo de flAIghts por este. Por favor, utiliza el siguiente código para verificar tu <strong>nuevo correo</strong>:", "#28a745", true, duration),

    passwordResetCode: (code: string, duration: string) =>
        baseCodeTemplate(code, "Código de recuperación de contraseña", "Has solicitado restablecer tu contraseña para vincular tu cuenta de <strong>flAIghts</strong> con Google. Por favor, utiliza el siguiente código:", "#007bff", false, duration),

    securityActionCode: (code: string, actionName: string, duration: string) =>
        baseCodeTemplate(code, `Código de seguridad: ${actionName}`, `Estás intentando realizar una acción sensible en tu cuenta de <strong>flAIghts</strong>: <strong>${actionName}</strong>. Por favor, utiliza el siguiente código para confirmar que eres tú:`, "#dc3545", true, duration),

    passwordReset: (url: string, duration: string) => ({
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
                <p style="color: #666; font-size: 0.9em;">Este enlace expirará en ${duration}. Si no has solicitado este cambio, puedes ignorar este correo de forma segura.</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="color: #999; font-size: 0.8em; text-align: center;">© 2026 flAIghts. Todos los derechos reservados.</p>
            </div>
        `
    })
};

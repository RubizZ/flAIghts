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
    welcomeEmail: (frontendUrl: string) =>
        baseInfoTemplate(
            "¡Bienvenido a flAIghts!",
            "Tu cuenta ha sido creada y verificada con éxito. Ya puedes empezar a disfrutar de todas las funcionalidades y buscar los mejores vuelos con la ayuda de nuestra inteligencia artificial.",
            `
            <div style="margin-top: 30px; text-align: center;">
                <a href="${frontendUrl}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff; text-decoration: none; font-weight: bold; border-radius: 5px; margin-bottom: 25px; box-shadow: 0 4px 6px rgba(0,123,255,0.2);">
                    ✈️ Empezar a buscar vuelos
                </a>
                
                <div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px;">
                    <p style="font-size: 0.85em; color: #666; margin-bottom: 15px;">Enlaces de interés:</p>
                    <div style="font-size: 0.85em; color: #007bff;">
                        <a href="${frontendUrl}/terms" style="color: #007bff; text-decoration: none; margin: 0 10px;">Términos de Servicio</a> |
                        <a href="${frontendUrl}/privacy" style="color: #007bff; text-decoration: none; margin: 0 10px;">Política de Privacidad</a> |
                        <a href="${frontendUrl}/about" style="color: #007bff; text-decoration: none; margin: 0 10px;">Sobre Nosotros</a> |
                        <a href="${frontendUrl}/contact" style="color: #007bff; text-decoration: none; margin: 0 10px;">Contacto</a>
                    </div>
                </div>
            </div>
            `
        ),

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
    }),

    evaluationCompleted: (frontendUrl: string, username: string) =>
        baseInfoTemplate(
            "¡Gracias por tu evaluación!",
            `Queremos agradecerte sinceramente, <strong>${username}</strong>, por haber completado la evaluación de flAIghts.`,
            `
            <div style="margin-top: 20px;">
                <p>Tu opinión es fundamental para ayudarnos a mejorar y ofrecerte la mejor experiencia posible en la búsqueda de vuelos con inteligencia artificial.</p>
                <p>Te animamos a que sigas explorando la aplicación y descubras todas las herramientas que tenemos preparadas para ti.</p>
                
                <div style="text-align: center; margin: 35px 0;">
                    <a href="${frontendUrl}" style="display: inline-block; padding: 14px 28px; background-color: #28a745; color: #ffffff; text-decoration: none; font-weight: bold; border-radius: 8px; box-shadow: 0 4px 6px rgba(40,167,69,0.2);">
                        ✈️ Volver a flAIghts
                    </a>
                </div>

                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px; border: 1px solid #e9ecef; margin-top: 25px;">
                    <p style="margin: 0; color: #495057; font-size: 0.95em;">
                        <strong>¿Sabías que...?</strong><br>
                        Como agradecimiento, hemos añadido la insignia de <strong>Evaluador</strong> a tu perfil. ¡Gracias por ayudarnos a crecer!
                    </p>
                </div>
            </div>
            `
        )
};

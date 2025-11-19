import { useEffect } from 'react';

const MessagePositionManager: React.FC = () => {
    useEffect(() => {
        const updateMessagePosition = () => {
            const viewportHeight = window.visualViewport?.height || window.innerHeight;
            const windowHeight = window.innerHeight;
            const keyboardHeight = windowHeight - viewportHeight;

            const bottomPosition = keyboardHeight > 0 ? keyboardHeight + 20 : 50;

            const style =
                document.getElementById('dynamic-message-style') || document.createElement('style');
            style.id = 'dynamic-message-style';
            style.innerHTML = `
        .ant-message {
          top: auto !important;
          bottom: ${bottomPosition}px !important;
          transition: bottom 0.2s ease-in-out;
        }
      `;

            if (!document.head.contains(style)) {
                document.head.appendChild(style);
            }
        };

        window.visualViewport?.addEventListener('resize', updateMessagePosition);
        window.visualViewport?.addEventListener('scroll', updateMessagePosition);

        updateMessagePosition();

        return () => {
            window.visualViewport?.removeEventListener('resize', updateMessagePosition);
            window.visualViewport?.removeEventListener('scroll', updateMessagePosition);
        };
    }, []);

    return null;
};

export default MessagePositionManager;
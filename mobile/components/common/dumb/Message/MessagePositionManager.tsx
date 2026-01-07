/**
CELLA Frontend
Website and Mobile templates that can be used to communicate
with CELLA WMS APIs.
Copyright (C) 2023 KLOCEL <contact@klocel.com>

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
**/
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
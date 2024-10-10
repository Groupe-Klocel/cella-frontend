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
import { Button } from 'antd';
import Link from 'next/link';
import { FC, ReactNode } from 'react';

export interface ILinkButtonProps {
	title?: string
	path: string | {
		pathname: string
		query: any
	}
	type?: "link" | "text" | "default" | "primary" | "dashed" | undefined
	icon?: ReactNode
}

const LinkButton: FC<ILinkButtonProps> = ({ title, path, type, icon }: ILinkButtonProps) => {
	return (
		<Link href={path} passHref>
			<Button icon={icon} type={type}>
				{title}
			</Button>
		</Link>
	);
}

LinkButton.displayName = 'LinkButton'

export { LinkButton };

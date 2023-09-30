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
import { DownOutlined } from '@ant-design/icons';
import { ProfileMenuType } from '@helpers';
import { Avatar, Dropdown, Menu, Space } from 'antd';
import { FC } from 'react';
export interface IProfileMenuProps {
    username: string;
    profileMenu: Array<ProfileMenuType>;
}

const ProfileMenu: FC<IProfileMenuProps> = ({ username, profileMenu }: IProfileMenuProps) => {
    const profileMenuItem = (
        <Menu>
            {profileMenu.map((menu) => (
                <Menu.Item onClick={menu.onClick} key={menu.key} icon={menu.icon}>
                    {menu.title}
                </Menu.Item>
            ))}
        </Menu>
    );

    return (
        <>
            <Space>
                <Avatar>{username.charAt(0).toUpperCase()}</Avatar>
                <Dropdown overlay={profileMenuItem} placement="bottomCenter">
                    <a onClick={(e) => e.preventDefault()} style={{ color: 'black' }}>
                        {`${username}   `} <DownOutlined />
                    </a>
                </Dropdown>
            </Space>
        </>
    );
};

ProfileMenu.displayName = 'ProfileMenu';

export { ProfileMenu };

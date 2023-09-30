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
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    console.log('hello world');
    const api_key = process.env.NEXT_PUBLIC_API_SECRET_KEY;
    console.log('apikey=', api_key);
    try {
        console.log(req.headers);
        const secret_key = req.headers.secret_key;
        console.log('secret_key=', secret_key);
        if (secret_key === api_key) {
            // Process the POST request
            res.status(200).json({ success: 'true' });
        } else {
            res.status(401).json({ message: 'unauthorized user' });
        }
    } catch (err) {
        console.log(err);
        res.status(500).end();
    }
}

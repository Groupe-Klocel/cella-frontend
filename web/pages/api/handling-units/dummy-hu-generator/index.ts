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

const parseCookie = (str: string) =>
    str
        .split(';')
        .map((v) => v.split('='))
        .reduce((acc: any, v) => {
            acc[decodeURIComponent(v[0].trim())] = decodeURIComponent(v[1].trim());
            return acc;
        }, {});

export default async (req: NextApiRequest, res: NextApiResponse) => {
    const cookie = parseCookie(req.headers.cookie ?? '');
    const token = cookie['token'];

    const requestHeader = {
        authorization: `Bearer ${token}`
    };

    // retrieve information from front
    const { huNb } = req.body;
    // const start = Date.now();
    try {
        let response;
        const HusToCreate = [];
        // const ssccLoopStart = Date.now();
        for (let i = 0; i < huNb; i++) {
            const SSCCres = await fetch(
                `${process.env.NEXT_PUBLIC_WMS_URL}/api/handling-units/sscc-generator`,
                {
                    method: 'POST',
                    headers: {
                        origin: `${req.headers.origin}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        extensionDigit: 0,
                        requestHeader
                    })
                }
            );
            const SSCC = await SSCCres.json();
            if (SSCC) {
                HusToCreate.push({ barcode: SSCC.response });
            }
        }
        // const ssccLoopEnd = Date.now();
        // console.log(`SSCC loop elapsed time: ${ssccLoopEnd - ssccLoopStart} ms`);
        // const startRenderLabel = Date.now();
        if (HusToCreate.length != 0) {
            const labelRes = await fetch(
                `${process.env.NEXT_PUBLIC_WMS_URL}/api/handling-units/print/label`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        handlingUnits: HusToCreate,
                        requestHeader
                    })
                }
            );
            response = await labelRes.json();
        }
        // const endRenderLabel = Date.now();
        // console.log(`Render elapsed time: ${endRenderLabel - startRenderLabel} ms`);
        res.status(200).json({ ...response });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
    // const end = Date.now();
    // console.log(`overall elapsed time: ${end - start} ms`);
};

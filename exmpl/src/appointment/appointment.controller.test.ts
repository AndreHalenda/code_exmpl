import { AppointmentController } from './appointment.controller';
import { APPOINTMENT_ENGINES } from 'dealer-sdk';
import * as sinon from 'sinon';
import { injectStore } from 'lambda-core';

describe('appointment/appointment.controller', () => {
    const mockDealerData = {
        dealerId: 'dealerId',
        dealerName: 'name',
        address: { city: 'City' },
        appointmentEngine: APPOINTMENT_ENGINES.ZEITMECHANIK,
        installer: true,
        geoPoint: {
            latitude: 1,
            longitude: 1,
        },
        timeSlot: [{
            date: '2018-08-24',
            startSlot: '16:15:00',
            endSlot: '16:30:00',
        }],
    };

    const mockDealerData1 = {
        dealerId: '30022307',
        dealerName: 'name',
        address: { city: 'City' },
        appointmentEngine: APPOINTMENT_ENGINES.ZEITMECHANIK,
        geoPoint: {
            latitude: 1,
            longitude: 1,
        },
        timeSlot: [{
            date: '2018-08-24',
            startSlot: '16:15:00',
            endSlot: '16:30:00',
        }],
    };

    const mockData = [
        Object.assign({}, mockDealerData1, { distance: 10000 }),
    ];

    const slotsService = {
        getFreeSlots: sinon.stub().resolves(mockData),
        getFreeSlotsByDealer: sinon.stub().resolves(mockDealerData1),
    };
    const appointmentId = '12345';
    const mockAppointmentData = {
        appointmentId,
        dealerId: '104141',
        appointmentDate: '2019-04-09T21:00:00Z',
        sentByEmail: true,
        sentBySMS: true,
        customer: {
            id: 'customerId',
            email: 'email',
            phoneNumbers: [{
                type: 'MOBILE',
                phone: '1111111111',
            }],
        },
    };

    const sandbox = sinon.createSandbox();

    const dealerClientMock = {
        invokeGetById: sandbox.stub().resolves(mockDealerData),
    };
    const engineClientMock = {
        bookAppointment: sandbox.stub().resolves({ appointmentId }),
        updateAppointment: sandbox.stub().resolves({ appointmentId }),
        providerSynchAppointment: sandbox.stub().resolves(),
        reopenAppointment: sandbox.stub().resolves(),
        getAppointmentById: sandbox.stub().resolves(mockAppointmentData),
        getAppointmentsByUsers: sandbox.stub().resolves([mockAppointmentData]),
        getAppointmentsByDealers: sandbox.stub().resolves([mockAppointmentData]),
        getAppointmentsByOrder: sandbox.stub().resolves([mockAppointmentData]),
        cancelAppointment: sandbox.stub().resolves(),
        completeAppointment: sandbox.stub().resolves(),
    };

    let controller: any;
    beforeAll(() => {
        injectStore.set('AppointmentSlotsService', {
            create: async () => slotsService,
        });
    });
    beforeEach(() => {
        controller = <any>new AppointmentController(<any>engineClientMock, <any>dealerClientMock);
    });

    describe('create()', () => {
        beforeEach(() => {
            sandbox.resetHistory();
        });

        it('Should return statusCode 200 on successful creation', async () => {
            const { body, statusCode } = await controller.create({
                headers: { Authorization: 'eyJraWQiOiI4MEN5ZnVTNEVBaytpTVwvZGlMaUpabVZpbGRCZjQzdzZWMk5jUDFadVNyOD0iLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiI3MG5mc2tvcWJlcHEycnVsc3RtZWpicmdhMyIsInRva2VuX3VzZSI6ImFjY2VzcyIsInNjb3BlIjoiYXBwb2ludG1lbnQuYXBpXC9jYW5jZWwuYXBwb2ludG1lbnQgcHJvZHVjdC5hcGlcL2dldC5lbnVtIGRtcy5hcGlcL3BsYWNlLm9yZGVyIGFwcG9pbnRtZW50LmFwaVwvY29tcGxldGUuYXBwb2ludG1lbnQgYXBwb2ludG1lbnQuYXBpXC9jcmVhdGUuYXBwb2ludG1lbnQgcHJvZHVjdC5hcGlcL2dldC5ieS5lYW4gcHJvZHVjdC5hcGlcL2dldC5ieS5jb2RlIGFwcG9pbnRtZW50LmFwaVwvdXBkYXRlLmFwcG9pbnRtZW50IGFwcG9pbnRtZW50LmFwaVwvcHJvdmlkZXIuc3luY2ggYXBwb2ludG1lbnQuYXBpXC9nZXQuYXBwb2ludG1lbnQiLCJhdXRoX3RpbWUiOjE1ODA5OTA1NTUsImlzcyI6Imh0dHBzOlwvXC9jb2duaXRvLWlkcC5ldS1jZW50cmFsLTEuYW1hem9uYXdzLmNvbVwvZXUtY2VudHJhbC0xX2V2eWVVYXo4VCIsImV4cCI6MTU4MDk5NDE1NSwiaWF0IjoxNTgwOTkwNTU1LCJ2ZXJzaW9uIjoyLCJqdGkiOiI5YmY2OWUzOC1jYWIzLTQ3MWUtOTkyNi05ZDgyM2Q1NzM0ZGEiLCJjbGllbnRfaWQiOiI3MG5mc2tvcWJlcHEycnVsc3RtZWpicmdhMyJ9.a2_0PZrnD4kmi_Eb21kLcFOruTQZuN_2M3yEjJW2DMHICjvxqu_tsuBk8JvldtsbyQi3NDhTZ8ZTyIPNf4ovdNuvKuPi4P04fA5zLkiW31VDc6R6c7cSxNZcwiFFMEdFEKmrGtdnfWsXn7fzZRJBbvFWK85XBpWSOahvOFPbE-JYsthU-EWvIl03OaoowgVcuArT5C0fN0acr0KUjER967MXrFtdNLEXrPVqDdDYi2bE4FlWHXw9tp70jR4CKmbHBS0zuCVge37eh6SUd4_G5-i_CvkeAM2gy8qRwmsTqs2UMGa30VHQeHWEMeO9sF9CoAcELq0c_DcJw1jMjkP0jw' },
                httpMethod: 'post',
                body: mockAppointmentData,
            }, null, null);
            const expectedResponse = {
                statusCode: 200,
                body: JSON.stringify({ appointmentId }),
            };

            let callCount = dealerClientMock.invokeGetById.callCount;
            expect(callCount).toEqual(1);
            callCount = engineClientMock.bookAppointment.callCount;
            expect(callCount).toEqual(1);
            expect({ body, statusCode }).toEqual(expectedResponse);
        });

        it('Should return statusCode 400 for undefined appointmentEngine fieald of dealer', async () => {
            mockDealerData.appointmentEngine = <any>undefined;
            const { body, statusCode } = await controller.create({
                headers: { Authorization: 'eyJraWQiOiI4MEN5ZnVTNEVBaytpTVwvZGlMaUpabVZpbGRCZjQzdzZWMk5jUDFadVNyOD0iLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiI3MG5mc2tvcWJlcHEycnVsc3RtZWpicmdhMyIsInRva2VuX3VzZSI6ImFjY2VzcyIsInNjb3BlIjoiYXBwb2ludG1lbnQuYXBpXC9jYW5jZWwuYXBwb2ludG1lbnQgcHJvZHVjdC5hcGlcL2dldC5lbnVtIGRtcy5hcGlcL3BsYWNlLm9yZGVyIGFwcG9pbnRtZW50LmFwaVwvY29tcGxldGUuYXBwb2ludG1lbnQgYXBwb2ludG1lbnQuYXBpXC9jcmVhdGUuYXBwb2ludG1lbnQgcHJvZHVjdC5hcGlcL2dldC5ieS5lYW4gcHJvZHVjdC5hcGlcL2dldC5ieS5jb2RlIGFwcG9pbnRtZW50LmFwaVwvdXBkYXRlLmFwcG9pbnRtZW50IGFwcG9pbnRtZW50LmFwaVwvcHJvdmlkZXIuc3luY2ggYXBwb2ludG1lbnQuYXBpXC9nZXQuYXBwb2ludG1lbnQiLCJhdXRoX3RpbWUiOjE1ODA5OTA1NTUsImlzcyI6Imh0dHBzOlwvXC9jb2duaXRvLWlkcC5ldS1jZW50cmFsLTEuYW1hem9uYXdzLmNvbVwvZXUtY2VudHJhbC0xX2V2eWVVYXo4VCIsImV4cCI6MTU4MDk5NDE1NSwiaWF0IjoxNTgwOTkwNTU1LCJ2ZXJzaW9uIjoyLCJqdGkiOiI5YmY2OWUzOC1jYWIzLTQ3MWUtOTkyNi05ZDgyM2Q1NzM0ZGEiLCJjbGllbnRfaWQiOiI3MG5mc2tvcWJlcHEycnVsc3RtZWpicmdhMyJ9.a2_0PZrnD4kmi_Eb21kLcFOruTQZuN_2M3yEjJW2DMHICjvxqu_tsuBk8JvldtsbyQi3NDhTZ8ZTyIPNf4ovdNuvKuPi4P04fA5zLkiW31VDc6R6c7cSxNZcwiFFMEdFEKmrGtdnfWsXn7fzZRJBbvFWK85XBpWSOahvOFPbE-JYsthU-EWvIl03OaoowgVcuArT5C0fN0acr0KUjER967MXrFtdNLEXrPVqDdDYi2bE4FlWHXw9tp70jR4CKmbHBS0zuCVge37eh6SUd4_G5-i_CvkeAM2gy8qRwmsTqs2UMGa30VHQeHWEMeO9sF9CoAcELq0c_DcJw1jMjkP0jw' },
                httpMethod: 'post',
                body: mockAppointmentData,
            }, null, null);
            const expectedResponse = {
                statusCode: 400,
                body: JSON.stringify({ error: 'Dealer is not available.' }),
            };

            let callCount = dealerClientMock.invokeGetById.callCount;
            expect(callCount).toEqual(1);
            callCount = engineClientMock.bookAppointment.callCount;
            expect(callCount).toEqual(0);
            expect({ body, statusCode }).toEqual(expectedResponse);
        });
    });

    describe('update()', () => {
        beforeEach(() => {
            sandbox.resetHistory();
        });

        it('Should return statusCode 200 on successful update', async () => {
            const { body, statusCode } = await controller.update({
                headers: {},
                httpMethod: 'put',
                body: mockAppointmentData,
                pathParameters: { appointmentId },
            }, null, null);
            const expectedResponse = {
                statusCode: 200,
                body: '',
            };

            const callCount = engineClientMock.updateAppointment.callCount;
            expect(callCount).toEqual(1);
            expect({ body, statusCode }).toEqual(expectedResponse);
        });
    });

    describe('providerSynch()', () => {
        beforeEach(() => {
            sandbox.resetHistory();
        });

        it('Should return statusCode 200 on successful sync', async () => {
            controller.getQueryParams = sinon.stub().returns({
                providerAppointmentId: 'test',
                dealerId: 'test',
            });
            const { body, statusCode } : any = await controller.providerSynch({
                headers: {},
                httpMethod: 'put',
                body: mockAppointmentData,
                queryParams: {
                    providerAppointmentId: 'test',
                    dealerId: 'test',
                },
            }, null, null);
            const expectedResponse = {
                statusCode: 200,
                body: '',
            };

            let callCount = dealerClientMock.invokeGetById.callCount;
            expect(callCount).toEqual(1);
            callCount = engineClientMock.providerSynchAppointment.callCount;
            expect(callCount).toEqual(1);
            expect({ body, statusCode }).toEqual(expectedResponse);
        });
    });

    describe('reopen()', () => {
        beforeEach(() => {
            sandbox.resetHistory();
        });

        it('Should return statusCode 200 on successful reopen', async () => {
            const { body, statusCode } = await controller.reopen({
                headers: {},
                httpMethod: 'put',
                body: mockAppointmentData,
                query: {
                    appointmentId,
                    dealerId: mockDealerData.dealerId,
                },
            }, null, null);
            const expectedResponse = {
                statusCode: 200,
                body: '',
            };

            let callCount = dealerClientMock.invokeGetById.callCount;
            expect(callCount).toEqual(1);
            callCount = engineClientMock.reopenAppointment.callCount;
            expect(callCount).toEqual(1);
            expect({ body, statusCode }).toEqual(expectedResponse);
        });
    });

    describe('get()', () => {
        beforeEach(() => {
            sandbox.resetHistory();
        });

        it('Should return statusCode 200 and appointment', async () => {
            const { body, statusCode } = await controller.get({
                headers: {},
                httpMethod: 'get',
                pathParameters: { appointmentId },
            }, null, null);
            const expectedResponse = {
                statusCode: 200,
                body: JSON.stringify(mockAppointmentData),
            };

            const callCount = engineClientMock.getAppointmentById.callCount;
            expect(callCount).toEqual(1);
            expect({ body, statusCode }).toEqual(expectedResponse);
        });
    });

    describe('getByUser()', () => {
        beforeEach(() => {
            sandbox.resetHistory();
        });

        it('Should return statusCode 200 and appointments list', async () => {
            const { body, statusCode } = await controller.getByUser({
                headers: {},
                httpMethod: 'get',
                pathParameters: { userId: 'test' },
                query: {
                    fromDate: 'test',
                    toDate: 'test',
                    status: 'test',
                },
            }, null, null);
            const expectedResponse = {
                statusCode: 200,
                body: JSON.stringify([mockAppointmentData]),
            };

            const callCount = engineClientMock.getAppointmentsByUsers.callCount;
            expect(callCount).toEqual(1);
            expect({ body, statusCode }).toEqual(expectedResponse);
        });
    });

    describe('getByDealer()', () => {
        beforeEach(() => {
            sandbox.resetHistory();
        });

        it('Should return statusCode 200 and appointments list', async () => {
            const { body, statusCode } = await controller.getByDealer({
                headers: {},
                httpMethod: 'get',
                pathParameters: { dealerId: mockDealerData.dealerId },
                query: {
                    fromDate: 'test',
                    toDate: 'test',
                    status: 'test',
                },
            }, null, null);
            const expectedResponse = {
                statusCode: 200,
                body: JSON.stringify([mockAppointmentData]),
            };

            const callCount = engineClientMock.getAppointmentsByDealers.callCount;
            expect(callCount).toEqual(1);
            expect({ body, statusCode }).toEqual(expectedResponse);
        });
    });

    describe('getByDealers()', () => {
        beforeEach(() => {
            sandbox.resetHistory();
        });

        it('Should return statusCode 200 and appointments list', async () => {
            const { body, statusCode } = await controller.getByDealers({
                headers: {},
                httpMethod: 'get',
                queryStringParameters: {
                    id: ['104141' , '3000180'],
                    fromDate: 'test',
                    toDate: 'test',
                    status: 'test',
                },
            }, null, null);

            const [query] = engineClientMock.getAppointmentsByDealers.getCall(0).args;
            expect(query.ids).toEqual(['104141' , '3000180']);
            expect({ body, statusCode }).toEqual({
                body: JSON.stringify([mockAppointmentData]),
                statusCode: 200,
            });
        });
    });

    describe('delete()', () => {
        beforeEach(() => {
            sandbox.resetHistory();
        });

        it('Should return statusCode 200 on successful delete', async () => {
            const { body, statusCode } = await controller.delete({
                headers: {},
                httpMethod: 'get',
                pathParameters: { appointmentId },
                query: {
                    comment: 'test',
                },
            }, null, null);
            const expectedResponse = {
                statusCode: 200,
                body: '',
            };

            let callCount = engineClientMock.getAppointmentById.callCount;
            expect(callCount).toEqual(1);
            callCount = engineClientMock.cancelAppointment.callCount;
            expect(callCount).toEqual(1);
            expect({ body, statusCode }).toEqual(expectedResponse);
        });
    });

    describe('complete()', () => {
        beforeEach(() => {
            sandbox.resetHistory();
        });

        it('Should return statusCode 200 on successful complete', async () => {
            const { body, statusCode } = await controller.complete({
                headers: {},
                httpMethod: 'get',
                pathParameters: { appointmentId },
                query: {
                    comment: 'test',
                },
            }, null, null);
            const expectedResponse = {
                statusCode: 200,
                body: '',
            };

            let callCount = engineClientMock.getAppointmentById.callCount;
            expect(callCount).toEqual(1);
            callCount = engineClientMock.completeAppointment.callCount;
            expect(callCount).toEqual(1);
            expect({ body, statusCode }).toEqual(expectedResponse);
        });
    });

    describe('getSlots()', () => {
        let response: any;
        beforeAll(async () => {
            response = await controller.getSlots({
                headers: {},
                httpMethod: 'get',
                queryStringParameters: {
                    latitude: '1',
                    longitude: '1',
                    distance: '10',
                    quantity: '1',
                    services: ['945002'],
                    country: ['DE'],
                },
            }, null, null);
        });

        it('Should return statusCode 200 on success response', () => {
            const expectedBody = JSON.stringify(mockData);

            expect(response.statusCode).toEqual(200);
            expect(response.body).toEqual(expectedBody);
        });

        it('Should pass transformed query to the service', () => {
            const query = slotsService.getFreeSlots.getCall(0).args[0];

            expect(query).toStrictEqual({
                latitude: 1,
                longitude: 1,
                distance: 10,
                quantity: 1,
                services: ['945002'],
                country: ['DE'],
            });
        });

        it('Should return statusCode 400 if numberOfDays <=0', async () => {
            const { statusCode, body } = await controller.getSlots({
                headers: {},
                httpMethod: 'get',
                queryStringParameters: {
                    latitude: '1',
                    longitude: '1',
                    distance: '10',
                    quantity: '1',
                    services: ['945002'],
                    country: ['DE'],
                    numberOfDays: 0,
                },
            }, null, null);

            expect(statusCode).toEqual(400);
            expect(body).toMatch(/Invalid query parameter numberOfDays/);
        });
    });

    describe('getSlotsByDealer()', () => {
        let response: any;
        beforeAll(async () => {
            response = await controller.getSlotsByDealer({
                headers: {},
                httpMethod: 'get',
                queryStringParameters: {
                    quantity: '1',
                },
                pathParameters: {
                    dealerId: '30022307',
                },
            }, null, null);
        });

        it('Should return statusCode 200 on success response', () => {
            const expectedBody = JSON.stringify(mockDealerData1);

            expect(response.statusCode).toEqual(200);
            expect(response.body).toEqual(expectedBody);
        });

        it('Should pass transformed query to the service', () => {
            const [dealerId, query] = slotsService.getFreeSlotsByDealer.getCall(0).args;

            expect(dealerId).toEqual(mockDealerData1.dealerId);
            expect(query).toStrictEqual({
                quantity: 1,
            });
        });
    });

});

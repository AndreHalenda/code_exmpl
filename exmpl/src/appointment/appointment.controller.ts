import {
    Controller,
    IResponseResult,
    MailService,
    Resource,
    Injectable,
    Inject,
    Logger,
    VariableType,
    HttpError,
    ResponseCode,
} from 'lambda-core';
import { INotifyByPinpointRequest, MailingClient, PinpointProviders } from 'mailing-sdk';
import { failAppointment } from '../templates';
import {
    IAppointmentQuery,
    IDealerQuery,
    IOrderQuery,
    IUserQuery,
    IBookingCreate,
    IBookingProviderSynch,
    IBookingResponse,
    IBookingUpdate,
    ICanceQuery,
    IClientAppointment,
    IProviderSynchQuery,
    IRangeQuery,
    IAppointmentsByDealersQuery,
    IReopenQuery,
    IFreeSlotsRequest,
    IFreeSlotsResponse,
    IDealer,
} from 'appointment-interface';
import { AppointmentEngineClient, IAppointment } from 'appointment-engine-sdk';
import { DealerClient } from 'dealer-sdk';
import { omit } from 'lodash';
import { AppointmentSlotsService } from '../services';

export class AppointmentController extends Controller {
    constructor(protected engine: AppointmentEngineClient, protected dealer: DealerClient) { super(); }

    @Resource()
    public async create(): Promise<IResponseResult | void> {
        const data = <IBookingCreate>this.getBody();

        this.check('customer', data.customer, customer => !!customer && !!customer.id);

        const { appointmentEngine, installer } =  await this.dealer.invokeGetById(data.dealerId);
        if (!(appointmentEngine && installer)) {
            return this.getResponse().badRequest('Dealer is not available.');
        }
        const req = omit(data, 'shopIdentifier');
        const shopIdentifier = (data.shopIdentifier) ? data.shopIdentifier : 'goodyear';
        try {
            const booking = await this.engine.bookAppointment({
                ...req,
                shopIdentifier,
                appointmentProvider: <any>appointmentEngine,
            });
            return this.getResponse().ok<IBookingResponse>({
                appointmentId: <string>booking.appointmentId,
            });
        } catch (e) {
            await this.notify(data, { code: e.code, message: e.error.message });
        }
    }

    @Injectable()
    protected async notify(data: any, error: { code: ResponseCode, message: string }, @Inject('LogService', {}) logger?: Logger): Promise<void> {
        const mailingClient = new MailingClient({
            stage: process.env.STAGE,
            region: process.env.MAILING_REGION,
            xray: true,
        });
        const params: INotifyByPinpointRequest = {
            provider: PinpointProviders.APPOINTMENT,
            email: {
                from: process.env.EMAIL_SENDER!,
                to: process.env.EMAIL_RECEIVER!,
                textBody: failAppointment(MailService!.formatObject(data), error.message),
                subject: 'Appointment Issue',
            },
        };
        try {
            await mailingClient!.notifyByPinpoint(params);
        } catch (e) {
            logger!.error(e);
        }
        throw new HttpError(error.code, error.message);
    }

    @Resource()
    public async update(): Promise<IResponseResult> {
        const { appointmentId: id } = this.getPathParams<IAppointmentQuery>();
        const { customer, licencePlate, appointmentDate, locale } = <IBookingUpdate>this.getBody();
        try {
            await this.engine.updateAppointment({
                appointmentDate,
                licencePlate,
                customer,
                locale,
                appointmentId: id,
            });
        } catch (e) {
            await this.notify({
                appointmentId: id,
            }, e);
        }
        return this.getResponse().ok();
    }

    @Resource()
    public async providerSynch(): Promise<IResponseResult> {
        const params = this.getQueryParams<IProviderSynchQuery>();
        params.dealerId = params.dealerId.replace(/^0+/g, '');
        const { providerAppointmentId, dealerId } = params;
        await this.dealer.invokeGetById(dealerId);
        const { appointmentDate } = <IBookingProviderSynch>this.getBody();
        try {
            await this.engine.providerSynchAppointment({
                appointmentDate,
                providerAppointmentId,
            });
        } catch (e) {
            await this.notify({
                providerAppointmentId,
                dealerId,
                appointmentDate,
            }, e);
        }
        return this.getResponse().ok();
    }

    @Resource()
    public async reopen(): Promise<IResponseResult> {
        const { appointmentId, dealerId } = this.getQueryParams<IReopenQuery>();
        await this.dealer.invokeGetById(dealerId);
        try {
            await this.engine.reopenAppointment({
                appointmentId,
            });
        } catch (e) {
            await this.notify({
                appointmentId,
                dealerId,
            }, e);
        }
        return this.getResponse().ok();
    }

    @Resource()
    public async get(): Promise<IResponseResult | void> {
        const { appointmentId: id } = this.getPathParams<IAppointmentQuery>();
        try {
            const booking: IAppointment = await this.engine.getAppointmentById({ id });
            const response = this.removeInternalData(booking);
            return this.getResponse().ok<IClientAppointment>(response);
        } catch (e) {
            await this.notify({
                appointmentId: id,
            }, e);
        }
    }

    @Resource()
    public async getByUser(): Promise<IResponseResult | void> {
        const { userId: id } = this.getPathParams<IUserQuery>();
        const { fromDate: dateFrom, toDate: dateTo, status } = this.getQueryParams<IRangeQuery>();
        try {
            const list = await this.engine.getAppointmentsByUsers({
                dateFrom,
                dateTo,
                status,
                ids: [this.decodeSpecialCharacters(id)],
            });
            const response = list.map(this.removeInternalData);
            return this.getResponse().ok<IClientAppointment[]>(response);
        } catch (e) {
            await this.notify({
                status,
                userId: id,
                fromDate: dateFrom,
                toDate: dateTo,
            }, e);
        }
    }

    @Resource()
    public async getByDealer(): Promise<IResponseResult | void> {
        const { dealerId: id } = this.getPathParams<IDealerQuery>();
        const { fromDate: dateFrom, toDate: dateTo, status } = this.getQueryParams<IRangeQuery>();
        try {
            const list = await this.engine.getAppointmentsByDealers({
                dateFrom,
                dateTo,
                status,
                ids: [id],
            });
            const response = list.map(this.removeInternalData);
            return this.getResponse().ok<IClientAppointment[]>(response);
        } catch (e) {
            await this.notify({
                status,
                dealerId: id,
                fromDate: dateFrom,
                toDate: dateTo,
            }, e);
        }
    }

    @Resource({map: {
        id: VariableType.ARRAY,
    }})
    public async getByDealers(): Promise<IResponseResult | void> {
        const query = this.getQueryParams<IAppointmentsByDealersQuery>();
        try {
            let appointmentResponse = Array<IAppointment>();
            const resp: IAppointment[] = await this.engine.getAppointmentsByDealers({
                dateFrom: query.fromDate,
                dateTo: query.toDate,
                status: query.status,
                ids: query.id,
            });
            appointmentResponse = appointmentResponse.concat(resp);
            const response = appointmentResponse.map(this.removeInternalData);
            return this.getResponse().ok<IClientAppointment[]>(response);
        } catch (e) {
            await this.notify({
                dateFrom: query.fromDate,
                dateTo: query.toDate,
                status: query.status,
                id: query.id,
            }, e);
        }
    }

    @Resource()
    public async getByOrder(): Promise<IResponseResult | void> {
        const { orderId: id } = this.getPathParams<IOrderQuery>();
        const { fromDate: dateFrom, toDate: dateTo, status } = this.getQueryParams<IRangeQuery>();
        try {
            const list = await this.engine.getAppointmentsByOrder({
                id,
                dateFrom,
                dateTo,
                status,
            });
            const response = list.map(this.removeInternalData);
            return this.getResponse().ok<IClientAppointment[]>(response);
        } catch (e) {
            await this.notify({
                status,
                dealerId: id,
                fromDate: dateFrom,
                toDate: dateTo,
            }, e);
        }
    }

    @Resource()
    public async delete(): Promise<IResponseResult> {
        const { appointmentId: id } = this.getPathParams<IAppointmentQuery>();
        const { comment = '' } = this.getQueryParams<ICanceQuery>() || {};

        try {
            const booking: IAppointment = await this.engine.getAppointmentById({ id });
            await this.engine.cancelAppointment({
                comment,
                dealerId: booking.dealerId,
                appointmentId: id,
                appointmentProvider: booking.appointmentProvider,
            });
        } catch (e) {
            await this.notify({
                comment,
                appointmentId: id,
            }, e);
        }
        return this.getResponse().ok();
    }

    @Resource()
    public async complete(): Promise<IResponseResult> {
        const { appointmentId: id } = this.getPathParams<IAppointmentQuery>();
        const { comment = '' } = this.getBody<ICanceQuery>() || {};
        try {
            await this.engine.getAppointmentById({ id });
            await this.engine.completeAppointment({
                comment,
                appointmentId: id,
            });
        } catch (e) {
            await this.notify({
                comment,
                appointmentId: id,
            }, e);
        }
        return this.getResponse().ok();
    }

    @Resource({
        map: {
            distance: VariableType.NUMBER,
            latitude: VariableType.NUMBER,
            longitude: VariableType.NUMBER,
            quantity: VariableType.NUMBER,
            numberOfDays: VariableType.NUMBER,
            services: VariableType.ARRAY,
            country: VariableType.ARRAY,
        },
    })
    @Injectable()
    public async getSlots(
        @Inject('AppointmentSlotsService') service?: AppointmentSlotsService,
    ): Promise<IResponseResult> {
        const query = this.getQueryParams<IFreeSlotsRequest>();
        this.check('numberOfDays', query.numberOfDays, numberOfDays => numberOfDays === undefined || numberOfDays > 0);
        const response = await service!.getFreeSlots(query);

        return this.getResponse().ok<IFreeSlotsResponse>(response);
    }

    @Resource({
        map: {
            quantity: VariableType.NUMBER,
            numberOfDays: VariableType.NUMBER,
            services: VariableType.ARRAY,
        },
    })

    @Injectable()
    public async getSlotsByDealer(
        @Inject('AppointmentSlotsService') service?: AppointmentSlotsService,
    ): Promise<IResponseResult> {
        const query = this.getQueryParams<IFreeSlotsRequest>();
        const { dealerId } = this.getPathParams();
        const response = await service!.getFreeSlotsByDealer(dealerId, query);

        return this.getResponse().ok<IDealer>(response);
    }

    private removeInternalData(appointment: IAppointment): IClientAppointment {
        const cleanAppointment = { ...appointment };
        delete cleanAppointment.providerAppointmentId;
        delete cleanAppointment.appointmentProvider;
        return cleanAppointment;
    }

    protected decodeSpecialCharacters(str: string) {
        return str.replace(/%7C/g, '|');
    }
}

import delay from 'utils/delay';
import request from 'utils/request';
import sjcl from 'sjcl';
import { ENCRYPT_KEY } from 'constant';
import { routerRedux } from 'app';
import enquire from 'enquire.js';
import Cookies from 'js-cookie';

const getInitState = () => ({
    user: null,
    privileges: [],
    openMobileMenu: false,
    collapsed: false,
    openKeys: [],
    menu: [],
    isMobile: document.documentElement.clientWidth <= 767
});
export default {
    namespace: 'app',
    persist: true,
    state: getInitState(),
    subscriptions: {
        setup({ dispatch }) {
            enquire.register('only screen and (min-width: 320px) and (max-width: 767px)', {
                match: () => {
                    dispatch({ type: 'changeToMobile' });
                },
                unmatch: () => {
                    dispatch({ type: 'changeToDesktop' });
                },
            });
        }
    },
    effects: {
        // app 初始化
        *init(action = {}, { call, put }) {
            yield delay(500);
            const { data, err } = yield call(request, '/api/signin', { post: {} });
            if (err) return;
            yield put({
                type: 'save',
                payload: {
                    user: data.user,
                    menu: data.menu,
                    privileges: Array.from(new Set([...data.user.role.rolePrivileges, ...data.user.currentCompany.jobPrivileges, ...data.user.currentCompany.userPrivileges]))
                }
            })
        },
        *login({ payload }, { call, put }) {
            // 登录
            const { data, err } = yield call(request,
                '/api/login',
                {
                    post: {
                        ...payload,
                        password: sjcl.encrypt(ENCRYPT_KEY, payload.password)
                    }
                });
            if (err) return;
            // 初始化获取偏好设置
            yield put({ type: 'init' });
            yield delay(500);
            // 路由到首页
            yield put(routerRedux.replace({
                pathname: '/'
            }));
        },
        *logout(action = {}, { call, put }) {
            const { data, err } = yield call(request, '/api/signin', { post: {} });
            yield put(routerRedux.replace({
                pathname: '/login'
            }));
            yield put({
                type: 'save',
                payload: getInitState()
            })
            // 清除Cookies
            Cookies.set('EGG_SESS', null);
        }
    },
    reducers: {
        save(state, action) {
            return { ...state, ...action.payload };
        },
        toggleCollapsed(state) {
            return { ...state, collapsed: !state.collapsed };
        },
        toggleMobileMenu(state) {
            return { ...state, openMobileMenu: !state.openMobileMenu };
        },
        changeToMobile(state, action) {
            if (state.isMobile) return state;
            return { ...state, isMobile: true };
        },
        changeToDesktop(state, action) {
            if (!state.isMobile) return state;
            return { ...state, isMobile: false };
        }
    }
};
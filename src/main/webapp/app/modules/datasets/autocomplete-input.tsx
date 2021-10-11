import './upload.scss';

import React from 'react';
import { connect } from 'react-redux';
import { IRootState } from 'app/shared/reducers';
import { AsyncTypeahead } from 'react-bootstrap-typeahead';
import axios from 'axios';
import 'react-bootstrap-typeahead/css/Typeahead.css';

export interface IAutocompleteInputProps extends StateProps, DispatchProps {
    id: string,
    index: number,
    placeholder: string,

    entity: string,
    field: string,
    dataset: string,
    size?: string,
    value?: string,

    uniqueValues: boolean,
    disabled: boolean,
    onChange: any,
    hasValidValue: any
    additionTriggerCallback: any
};

export class AutocompleteInput extends React.Component<IAutocompleteInputProps> {

    ref = null;
    index = 0;

    readonly state: any = {
        menuOpen: false,
        blurValue: '',
        isLoading: false,
        options: [],
        current: ''
    };

    constructor(props) {
        super(props);
        this.ref = React.createRef();
    }

    componentDidUpdate(prevProps: Readonly<IAutocompleteInputProps>, prevState: Readonly<{}>, snapshot?: any) {
        if (this.index !== this.props.index) {
            this.setState({
                current:''
            },()=>{
                this.clearField();
                this.index = this.props.index;
            });
        }
    }

    emitValidity() {
        const currentFieldValue = this.state.current;
        if (this.props.hasValidValue) {
            if (currentFieldValue) {
                return this.props.hasValidValue(this.validateCurrentValue());
            } else {
                this.props.hasValidValue(false);
            }
        }
    }

    emitValue(callback = () => {
    }) {
        const currentFieldValueLC = this.state.current.toLowerCase();
        if (currentFieldValueLC) {
            const validOption = this.state.options.find(option => option.name.toLowerCase() === currentFieldValueLC);
            if (validOption !== undefined) {
                this.props.onChange(validOption, callback);
            } else {
                this.props.onChange('', callback);
            }
        } else {
            this.props.onChange('', callback);
        }
    }

    onBlur() {
        if (this.state.isLoading) {
            this.setState({
                blurValue: this.state.current
            });
        } else {
            this.emitValue();
        }
    }

    onInput(currentValue) {
        if (currentValue) {
            const isLoading = true; // change for looking in cache
            this.setState({
                isLoading,
                current: currentValue
            }, () => {
                if (this.props.hasValidValue) {
                    this.props.hasValidValue(false);
                }
            });
        } else {
            this.setState({
                current: ''
            }, () => {
                if (this.props.hasValidValue) {
                    this.props.hasValidValue(false)
                }
            });
        }
    }

    onSearch(query) {
        axios.get(`api/datasets/autocomplete`, {
            params: {
                entity: this.props.entity,
                field: this.props.field,
                dataset: this.props.dataset,
                term: query,
                uniqueValues: this.props.uniqueValues,
            }
        }).then((response) => {
            if (this.state.current === query) {
                if (this.state.blurValue && this.state.blurValue === this.state.current) {
                    this.setState({
                        isLoading: false,
                        options: response.data,
                        blurValue: ''
                    }, () => {
                        this.emitValue();
                        this.emitValidity();
                    });
                } else {
                    this.setState({
                        isLoading: false,
                        options: response.data
                    }, () => {
                        this.emitValidity();
                    });
                }
            }
        });
    }

    validateCurrentValue() {
        const currentFieldValueLC = this.state.current.toLowerCase();
        if (currentFieldValueLC) {
            const foundOption = this.state.options.find(option => option.name.toLowerCase()===currentFieldValueLC);
            return (foundOption!==undefined)?foundOption:false;
        }
    }

    clearField() {
        if ((this.ref) && (this.ref.current)) {
            this.ref.current.getInstance().clear();
        }
    }

    onKeyDown(e) {
        if (e.key === 'Enter' && !this.state.menuOpen) {
            this.emitValue(this.props.additionTriggerCallback);
        }
    }

    onMenuToggle(isOpen) {
        this.setState({
            menuOpen: isOpen
        });
    }

    onChange(e) {
        if (e.length > 0) {
            this.setState({
                current: e[0].name
            }, this.emitValidity);
        }
    }

    render() {
        const asyncTypeaheadJsx=<AsyncTypeahead
            allowNew={false}
            isLoading={this.state.isLoading}
            multiple={false}
            options={this.state.options || this.state.lastOptions || [this.state.current]}
            id={this.props.id}
            labelKey="name"
            minLength={3}
            onInputChange={this.onInput.bind(this)}
            onSearch={this.onSearch.bind(this)}
            onChange={this.onChange.bind(this)}
            onBlur={this.onBlur.bind(this)}
            onMenuToggle={this.onMenuToggle.bind(this)}
            onKeyDown={this.onKeyDown.bind(this)}
            placeholder={this.props.placeholder}
            disabled={this.props.disabled}
            bsSize={this.props.size}
            useCache={false}
            ref={this.ref}
        />
        return asyncTypeaheadJsx;
    }
};


const mapStateToProps = (storeState: IRootState) => ({});

const mapDispatchToProps = {};

type StateProps = ReturnType<typeof mapStateToProps>;
type DispatchProps = typeof mapDispatchToProps;

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(AutocompleteInput);




// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/** @jsx jsx */
import { jsx, css } from '@emotion/react';
import formatMessage from 'format-message';
import { IconButton, IButtonStyles } from '@fluentui/react/lib/Button';
import { Callout, DirectionalHint } from '@fluentui/react/lib/Callout';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { TooltipHost, TooltipOverflowMode } from '@fluentui/react/lib/Tooltip';
import { FocusTrapZone } from '@fluentui/react/lib/FocusTrapZone';
import { useCallback, useState, Fragment, useMemo, useEffect } from 'react';
import { NeutralColors, SharedColors, FontSizes, CommunicationColors } from '@fluentui/theme';
import { useRecoilValue } from 'recoil';
import { TeachingBubble } from '@fluentui/react/lib/TeachingBubble';
import { mergeStyleSets } from '@fluentui/react/lib/Styling';

import {
  dispatcherState,
  appUpdateState,
  botDisplayNameState,
  localeState,
  currentProjectIdState,
  rootBotProjectIdSelector,
  settingsState,
  webChatEssentialsSelector,
  botProjectSpaceLoadedState,
  isWebChatPanelVisibleState,
  allRequiredRecognizersSelector,
  showGetStartedTeachingBubbleState,
} from '../recoilModel';
import composerIcon from '../images/composerIcon.svg';
import { AppUpdaterStatus } from '../constants';
import TelemetryClient from '../telemetry/TelemetryClient';
import { useBotControllerBar } from '../hooks/useControllerBar';

import { AuthCard } from './Auth/AuthCard';
import { languageListTemplates, languageFullName } from './MultiLanguage';
import { NotificationButton } from './Notifications/NotificationButton';
import { BotController } from './BotRuntimeController/BotController';
import { GetStarted } from './GetStarted/GetStarted';

export const actionButton = css`
  font-size: ${FontSizes.size18};
  margin-top: 2px;
`;

// -------------------- Styles -------------------- //
const headerContainer = css`
  position: relative;
  background: ${SharedColors.cyanBlue10};
  height: 50px;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16px;

  label: HeaderContainer;
`;

const botLocale = css`
  font-size: 12px;
  color: #fff;
  border-radius: 19px;
  background: ${CommunicationColors.shade30};
  padding-left: 10px;
  padding-right: 10px;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const headerTextContainer = css`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  min-width: 50px;
  gap: 8px;
`;

const rightSection = css`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-width: 200px;
  margin: 0 10px;
  margin-left: auto;
  flex-shrink: 0;
`;

const buttonStyles: IButtonStyles = {
  icon: {
    color: '#fff',
    fontSize: FontSizes.size18,
  },
  root: {
    height: '40px',
    width: '40px',
    selectors: {
      ':disabled .ms-Button-icon': {
        opacity: 0.4,
        color: `${NeutralColors.white}`,
      },
    },
  },
  rootHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  rootPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  rootDisabled: {
    backgroundColor: `${CommunicationColors.primary}`,
  },
};

const calloutStyle = {
  root: {
    padding: 24,
  },
  calloutMain: {
    width: 330,
    height: 120,
  },
};

const calloutHeader = css`
  color: ${NeutralColors.black};
  font-size: ${FontSizes.size20};
`;

const calloutDescription = css`
  padding-top: 12px;
  color: ${NeutralColors.black};
  font-size: ${FontSizes.size12};
`;

const logo = css`
  margin-left: 9px;
  @media screen and (max-width: 480px) /* 300% zoom */ {
    display: none;
  }
`;

const searchArea = css`
  margin-right: 12px;
  width: 220px;
  @media screen and (max-width: 720px) /* 150% zoom */ {
    width: unset;
`;

const classNames = mergeStyleSets({
  projectNameOverflow: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: FontSizes.size16,
    color: NeutralColors.white,
  },
  subComponentStyles: {
    projectNameTooltip: {
      root: { display: 'block' },
    },
  },
});

// -------------------- Header -------------------- //

export const Header = () => {
  const { setAppUpdateShowing, setLocale } = useRecoilValue(dispatcherState);
  const projectId = useRecoilValue(currentProjectIdState);
  const rootBotProjectId = useRecoilValue(rootBotProjectIdSelector) || projectId;
  const projectName = useRecoilValue(botDisplayNameState(projectId));
  const locale = useRecoilValue(localeState(projectId));
  const appUpdate = useRecoilValue(appUpdateState);
  const [teachingBubbleVisibility, setTeachingBubbleVisibility] = useState<boolean>();
  const showGetStartedTeachingBubble = useRecoilValue(showGetStartedTeachingBubbleState);
  const settings = useRecoilValue(settingsState(projectId));
  const isWebChatPanelVisible = useRecoilValue(isWebChatPanelVisibleState);
  const botProjectSolutionLoaded = useRecoilValue(botProjectSpaceLoadedState);

  const { languages, defaultLanguage } = settings;
  const { showing, status } = appUpdate;
  const rootBotId = useRecoilValue(rootBotProjectIdSelector) ?? '';
  const webchatEssentials = useRecoilValue(webChatEssentialsSelector(rootBotId));
  const { setWebChatPanelVisibility, setShowGetStartedTeachingBubble } = useRecoilValue(dispatcherState);

  const [hideBotController, hideBotStartController] = useState(true);
  const [showGetStarted, setShowGetStarted] = useState<boolean>(false);
  const [showStartBotTeachingBubble, setShowStartBotTeachingBubble] = useState<boolean>(false);
  const [requiresLUIS, setRequiresLUIS] = useState<boolean>(false);
  const [requiresQNA, setRequiresQNA] = useState<boolean>(false);

  // These are needed to determine if the bot needs LUIS or QNA
  // this data is passed into the GetStarted widget
  // ... if the get started widget moves, this code should too!
  const requiredStuff = useRecoilValue(allRequiredRecognizersSelector);

  useEffect(() => {
    if (botProjectSolutionLoaded) {
      setRequiresLUIS(requiredStuff.some((p) => p.requiresLUIS));
      setRequiresQNA(requiredStuff.some((p) => p.requiresQNA));
    }
  }, [requiredStuff, botProjectSolutionLoaded]);
  // ... end of get started stuff

  const isShow = useBotControllerBar();

  useEffect(() => {
    if (!isShow) {
      setWebChatPanelVisibility(false);
    }
  }, [isShow]);

  const onUpdateAvailableClick = useCallback(() => {
    setAppUpdateShowing(true);
  }, []);

  const hideTeachingBubble = () => {
    setShowStartBotTeachingBubble(false);
  };
  const toggleGetStarted = (newvalue) => {
    hideTeachingBubble();
    setShowGetStartedTeachingBubble(false);
    setShowGetStarted(newvalue);
  };

  // pop out get started if #getstarted is in the URL
  useEffect(() => {
    if (showGetStartedTeachingBubble) {
      setShowGetStarted(true);
    }
  }, [showGetStartedTeachingBubble]);

  useEffect(() => {
    if (isWebChatPanelVisible) {
      hideBotStartController(true);
    }
  }, [isWebChatPanelVisible]);

  useEffect(() => {
    if (!hideBotController && showGetStarted) {
      setShowGetStarted(false);
    }
  }, [hideBotController]);

  const showUpdateAvailableIcon = status === AppUpdaterStatus.UPDATE_AVAILABLE && !showing;

  const languageListOptions = useMemo(() => {
    const languageList = languageListTemplates(languages, locale, defaultLanguage);
    const enableLanguages = languageList.filter(({ isEnabled }) => !!isEnabled);
    return enableLanguages.map((item) => {
      const { language, locale } = item;
      return {
        key: locale,
        title: locale,
        text: language,
      };
    });
  }, [languages]);

  const onLanguageChange = (_event: React.FormEvent<HTMLDivElement>, option?: IDropdownOption, _index?: number) => {
    const selectedLang = option?.key as string;
    if (selectedLang && selectedLang !== locale) {
      setLocale(selectedLang, projectId);
    }
  };

  const handleActiveLanguageButtonOnDismiss = () => {
    setTeachingBubbleVisibility(false);
  };

  const handleActiveLanguageButtonOnKeyDown = (e) => {
    if (e.key.toLowerCase() === 'enter') {
      e.preventDefault();
      setTeachingBubbleVisibility(true);
    }
  };

  const logoLabel = formatMessage('Composer Logo');
  const testLabel = formatMessage('Test your bot');
  const rocketLabel = formatMessage('Recommended actions');
  const updateLabel = formatMessage('Update available');

  return (
    <div css={headerContainer} role="banner">
      <img alt={logoLabel} aria-label={logoLabel} css={logo} src={composerIcon} />
      <div css={headerTextContainer}>
        {projectName && (
          <Fragment>
            <TooltipHost
              content={projectName}
              hostClassName={classNames.projectNameOverflow}
              overflowMode={TooltipOverflowMode.Self}
              styles={classNames.subComponentStyles.projectNameTooltip}
            >
              {projectName}
            </TooltipHost>
            {languageListOptions.length > 1 && (
              <span
                css={botLocale}
                id="targetButton"
                role={'button'}
                tabIndex={0}
                onClick={() => setTeachingBubbleVisibility(true)}
                onKeyDown={handleActiveLanguageButtonOnKeyDown}
              >
                {languageFullName(locale)}
              </span>
            )}
          </Fragment>
        )}
      </div>
      <div css={rightSection}>
        {isShow && (
          <div css={searchArea}>
            <BotController
              isControllerHidden={hideBotController}
              onHideController={(isHidden: boolean) => {
                hideBotStartController(isHidden);
                if (!isHidden) {
                  setWebChatPanelVisibility(false);
                }
              }}
            />
          </div>
        )}
        {isShow && (
          <TooltipHost content={testLabel} directionalHint={DirectionalHint.bottomCenter}>
            <IconButton
              ariaDescription={testLabel}
              disabled={!webchatEssentials?.botUrl}
              iconProps={{
                iconName: 'OfficeChat',
              }}
              styles={buttonStyles}
              onClick={() => {
                const currentWebChatVisibility = !isWebChatPanelVisible;
                setWebChatPanelVisibility(currentWebChatVisibility);
                if (currentWebChatVisibility) {
                  TelemetryClient.track('WebChatPaneOpened');
                } else {
                  TelemetryClient.track('WebChatPaneClosed');
                }
              }}
            />
          </TooltipHost>
        )}
        <NotificationButton buttonStyles={buttonStyles} />
        {isShow && (
          <TooltipHost content={rocketLabel} directionalHint={DirectionalHint.bottomCenter}>
            <IconButton
              ariaLabel={rocketLabel}
              iconProps={{ iconName: 'Rocket' }}
              id="rocketButton"
              styles={buttonStyles}
              onClick={() => toggleGetStarted(!showGetStarted)}
            />
          </TooltipHost>
        )}
        {isShow && showStartBotTeachingBubble && (
          <TeachingBubble
            hasCloseButton
            hasCondensedHeadline
            calloutProps={{ directionalHint: DirectionalHint.bottomAutoEdge }}
            headline={formatMessage('You’re ready to go!')}
            target="#startBotPanelElement"
            onDismiss={hideTeachingBubble}
          >
            {formatMessage(
              'Click start and your bot will be up and running. Once it’s running, you can select “Open in WebChat” to test.'
            )}
          </TeachingBubble>
        )}
        {showUpdateAvailableIcon && (
          <TooltipHost content={updateLabel} directionalHint={DirectionalHint.bottomCenter}>
            <IconButton
              iconProps={{ iconName: 'History' }}
              styles={buttonStyles}
              title={updateLabel}
              onClick={onUpdateAvailableClick}
            />
          </TooltipHost>
        )}
        <AuthCard />
      </div>
      {teachingBubbleVisibility && (
        <Callout
          directionalHint={DirectionalHint.bottomLeftEdge}
          styles={calloutStyle}
          target="#targetButton"
          onDismiss={handleActiveLanguageButtonOnDismiss}
        >
          <div css={calloutHeader}> {formatMessage('Active language')}</div>
          <div css={calloutDescription}>
            {formatMessage(
              'This is the bot language you are currently authoring. Change the active language in the dropdown below.'
            )}
          </div>
          <FocusTrapZone isClickableOutsideFocusTrap>
            <Dropdown
              options={languageListOptions}
              placeholder="Select an option"
              selectedKey={locale}
              styles={{ root: { marginTop: 12 } }}
              onChange={onLanguageChange}
            />
          </FocusTrapZone>
        </Callout>
      )}

      <GetStarted
        isOpen={botProjectSolutionLoaded && showGetStarted}
        projectId={rootBotProjectId}
        requiresLUIS={requiresLUIS}
        requiresQNA={requiresQNA}
        showTeachingBubble={botProjectSolutionLoaded && showGetStartedTeachingBubble}
        onBotReady={() => {
          setShowStartBotTeachingBubble(true);
        }}
        onDismiss={() => {
          toggleGetStarted(false);
        }}
      />
    </div>
  );
};
